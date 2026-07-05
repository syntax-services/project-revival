import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SQUAD_SECRET_KEY = Deno.env.get("SQUAD_SECRET_KEY");
    if (!SQUAD_SECRET_KEY) {
      throw new Error("SQUAD_SECRET_KEY is not configured in the environment variables");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized access");
    }

    const { withdrawalRequestId } = await req.json();
    if (!withdrawalRequestId) {
      throw new Error("Withdrawal request ID is required");
    }

    // Fetch withdrawal request details
    const { data: wdRequest, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*, profiles:user_id(full_name, email)")
      .eq("id", withdrawalRequestId)
      .single();

    if (fetchError || !wdRequest) {
      throw new Error("Withdrawal request not found");
    }

    // Security check
    if (wdRequest.user_id !== user.id) {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) {
        throw new Error("Unauthorized access to this withdrawal request");
      }
    }

    if (wdRequest.status !== "pending") {
      throw new Error("Withdrawal request is already processed or in progress");
    }

    // Fetch user profile for AML checks
    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("verification_level, wallet_balance, total_funded, total_spent, aml_flagged, last_withdrawn_at")
      .eq("user_id", wdRequest.user_id)
      .single();

    if (profError || !profile) {
      throw new Error("User profile not found for compliance validation");
    }

    // --- Smart AML (Anti-Money Laundering) Safeguards ---
    const withdrawalAmount = Number(wdRequest.amount);

    // AML Rule 1: Level 2 identity verification requirement
    if (!profile.verification_level || profile.verification_level < 2) {
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_notes: "AML Reject: User has not completed Level 2 Identity Verification (NIN/BVN)."
        })
        .eq("id", wdRequest.id);
      throw new Error("AML Block: Level 2 Identity Verification (NIN/BVN) is required for payout withdrawals.");
    }

    // AML Rule 2: Flagged account lockout
    if (profile.aml_flagged) {
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_notes: "AML Reject: Account is currently flagged for suspicious activity."
        })
        .eq("id", wdRequest.id);
      throw new Error("AML Block: Account is flagged for suspicious activity and transfers are suspended.");
    }

    // AML Rule 3: Single Transaction High-value cap
    if (withdrawalAmount > 50000) {
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_notes: "AML Reject: Single payout request exceeds maximum limit of ₦50,000."
        })
        .eq("id", wdRequest.id);
      throw new Error("AML Block: Payout requests are capped at a maximum of ₦50,000 per transaction.");
    }

    // AML Rule 4: Velocity / Wash Trading Check (70% Rule)
    // User must have spent at least 70% of total funded deposits on product/service purchases
    const funded = Number(profile.total_funded || 0);
    const spent = Number(profile.total_spent || 0);
    if (funded > 0 && spent / funded < 0.70) {
      // Flag the user profile for suspicious laundering velocity
      await supabase
        .from("profiles")
        .update({ aml_flagged: true })
        .eq("user_id", wdRequest.user_id);

      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_notes: `AML Reject: Suspicious deposit-to-spend ratio. Spent: ₦${spent}, Funded: ₦${funded} (Ratio: ${((spent/funded)*100).toFixed(1)}% < 70%). Account has been flagged.`
        })
        .eq("id", wdRequest.id);

      throw new Error("AML Block: Suspicious transaction velocity. Your account has been flagged for compliance review.");
    }

    // AML Rule 5: 24-hour Payout Cooling Period
    if (profile.last_withdrawn_at) {
      const hoursSinceLast = (Date.now() - new Date(profile.last_withdrawn_at).getTime()) / 3600000;
      if (hoursSinceLast < 24) {
        await supabase
          .from("withdrawal_requests")
          .update({
            status: "rejected",
            admin_notes: "AML Reject: 24-hour cooling period violation."
          })
          .eq("id", wdRequest.id);
        throw new Error("AML Block: A mandatory 24-hour cooling period is enforced between payout withdrawals.");
      }
    }

    const amountInKobo = Math.round(withdrawalAmount * 100);
    const bankCode = wdRequest.bank_name;
    const accountNumber = wdRequest.account_number;
    const accountName = wdRequest.account_name;

    console.log(`Processing Squad transfer request ${wdRequest.id} of ₦${withdrawalAmount} to bank ${bankCode}, acct ${accountNumber}`);

    // Call Squad Transfer API
    const squadResponse = await fetch("https://api-d.squadco.com/payout/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInKobo,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        remarks: "String Wallet Cashout Withdrawal Payout",
        transaction_reference: `WD-${wdRequest.id.substring(0, 8)}`
      })
    });

    const squadData = await squadResponse.json();

    if (!squadResponse.ok || !squadData.success) {
      throw new Error(squadData.message || "Failed to initiate transfer via Squad API");
    }

    const txRef = squadData.data?.transaction_reference || `WD-${wdRequest.id.substring(0, 8)}`;
    const txStatus = squadData.data?.status || "success";

    console.log(`Squad transfer success: ref=${txRef}, status=${txStatus}`);

    // Update Withdrawal Request status in database
    const dbStatus = (txStatus === "success" || txStatus === "processing" || txStatus === "pending")
      ? "processing"
      : "rejected";

    await supabase
      .from("withdrawal_requests")
      .update({
        status: dbStatus,
        admin_notes: `Processed via Squad transfer. Ref: ${txRef}. Status: ${txStatus}.`,
        processed_at: new Date().toISOString()
      })
      .eq("id", wdRequest.id);

    // Update last withdrawn timestamp on profile
    await supabase
      .from("profiles")
      .update({ last_withdrawn_at: new Date().toISOString() })
      .eq("user_id", wdRequest.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Squad transfer initiated successfully",
        transactionReference: txRef,
        status: dbStatus
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Payout edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Payout processing failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
