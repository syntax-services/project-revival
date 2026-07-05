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
      throw new Error("SQUAD_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, squad_subaccount_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    // If already has subaccount, return it
    if (profile.squad_subaccount_id) {
      return new Response(
        JSON.stringify({ success: true, subaccountId: profile.squad_subaccount_id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Determine Squad API base URL based on key prefix
    const isSandbox = SQUAD_SECRET_KEY.startsWith("sandbox_") || SQUAD_SECRET_KEY.includes("test");
    const baseUrl = isSandbox 
      ? "https://sandbox-api-d.squadco.com" 
      : "https://api-d.squadco.com";

    console.log(`Generating Squad sub-account on-the-fly for user ${userId} using base: ${baseUrl}`);

    // Create sub-merchant on Squad
    const squadResponse = await fetch(`${baseUrl}/merchant/create-sub-users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: profile.full_name || `String User ${userId.substring(0, 5)}`,
        account_name: `String - ${profile.full_name || userId.substring(0, 8)}`,
        account_number: "0000000000",
        bank_code: "058", // Default GTBank
        bank: "Guaranty Trust Bank",
      }),
    });

    const squadData = await squadResponse.json();

    if (!squadResponse.ok || !squadData.success) {
      console.warn("Squad Subaccount API response error:", squadData);
      throw new Error(squadData.message || "Failed to create sub-merchant on Squad");
    }

    const subaccountId = squadData.data?.subaccount_id;
    if (!subaccountId) {
      throw new Error("Squad API did not return a subaccount_id");
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ squad_subaccount_id: subaccountId })
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to save subaccount ID to profile: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, subaccountId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("squad-subaccount edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to generate subaccount" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
