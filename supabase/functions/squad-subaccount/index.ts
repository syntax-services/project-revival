import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProfileForSubaccount = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  squad_subaccount_id: string | null;
};

const getBaseUrl = (secretKey: string) => {
  const isSandbox = secretKey.startsWith("sandbox_") || secretKey.includes("test");
  return isSandbox ? "https://sandbox-api-d.squadco.com" : "https://api-d.squadco.com";
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const squadSecretKey = Deno.env.get("SQUAD_SECRET_KEY");
    if (!squadSecretKey) {
      throw new Error("SQUAD_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const backfill = body.backfill === true;
    const limit = Math.min(Math.max(Number(body.limit || 25), 1), 100);
    const backfillToken = Deno.env.get("SQUAD_BACKFILL_TOKEN");
    const providedBackfillToken = req.headers.get("x-string-admin-token");
    const hasBackfillToken = !!backfillToken && providedBackfillToken === backfillToken;

    const authHeader = req.headers.get("Authorization");
    let authUserId: string | null = null;
    let isAdmin = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        authUserId = user.id;
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!adminRole;
      }
    }

    const targetUserId = String(body.userId || authUserId || "");

    if (backfill && !isAdmin && !hasBackfillToken) {
      throw new Error("Only admins can run Squad subaccount backfill");
    }

    if (!backfill && !authUserId) {
      throw new Error("Missing Authorization header");
    }

    if (!backfill && targetUserId !== authUserId && !isAdmin) {
      throw new Error("You can only create your own Squad subaccount");
    }

    const createSubaccount = async (profile: ProfileForSubaccount) => {
      if (profile.squad_subaccount_id) {
        await supabase
          .from("squad_subaccount_jobs")
          .upsert({
            user_id: profile.user_id,
            status: "succeeded",
            squad_subaccount_id: profile.squad_subaccount_id,
            processed_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        return { userId: profile.user_id, subaccountId: profile.squad_subaccount_id, skipped: true };
      }

      await supabase
        .from("squad_subaccount_jobs")
        .upsert({
          user_id: profile.user_id,
          status: "processing",
          attempts: 1,
        }, { onConflict: "user_id" });

      await supabase
        .from("profiles")
        .update({
          squad_subaccount_status: "processing",
          squad_subaccount_error: null,
        })
        .eq("user_id", profile.user_id);

      const displayName = profile.full_name?.trim() || profile.email || `String User ${profile.user_id.slice(0, 8)}`;
      const baseUrl = getBaseUrl(squadSecretKey);

      const squadResponse = await fetch(`${baseUrl}/merchant/create-sub-users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${squadSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName,
          account_name: `String - ${displayName}`.slice(0, 100),
          account_number: "0000000000",
          bank_code: "058",
          bank: "Guaranty Trust Bank",
        }),
      });

      const rawText = await squadResponse.text();
      let squadData: any;
      try {
        squadData = JSON.parse(rawText);
      } catch {
        throw new Error(`Squad returned invalid subaccount response (${squadResponse.status}): ${rawText.slice(0, 200)}`);
      }

      if (!squadResponse.ok || !squadData.success) {
        throw new Error(squadData.message || `Squad subaccount failed (${squadResponse.status})`);
      }

      const subaccountId = squadData.data?.subaccount_id || squadData.data?.id;
      if (!subaccountId) {
        throw new Error("Squad API did not return a subaccount_id");
      }

      await supabase
        .from("profiles")
        .update({
          squad_subaccount_id: subaccountId,
          squad_subaccount_status: "active",
          squad_subaccount_error: null,
          squad_subaccount_created_at: new Date().toISOString(),
        })
        .eq("user_id", profile.user_id);

      await supabase
        .from("squad_subaccount_jobs")
        .upsert({
          user_id: profile.user_id,
          status: "succeeded",
          squad_subaccount_id: subaccountId,
          last_error: null,
          processed_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      return { userId: profile.user_id, subaccountId };
    };

    if (backfill) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, squad_subaccount_id")
        .is("squad_subaccount_id", null)
        .limit(limit);

      if (profileError) {
        throw profileError;
      }

      const results = [];
      for (const profile of (profiles || []) as ProfileForSubaccount[]) {
        try {
          results.push(await createSubaccount(profile));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to create Squad subaccount";
          results.push({ userId: profile.user_id, error: message });
          await supabase
            .from("profiles")
            .update({
              squad_subaccount_status: "failed",
              squad_subaccount_error: message,
            })
            .eq("user_id", profile.user_id);
          await supabase
            .from("squad_subaccount_jobs")
            .upsert({
              user_id: profile.user_id,
              status: "failed",
              last_error: message,
              processed_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
        }
      }

      return jsonResponse({ success: true, processed: results.length, results });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, squad_subaccount_id")
      .eq("user_id", targetUserId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    const result = await createSubaccount(profile as ProfileForSubaccount);
    return jsonResponse({ success: true, subaccountId: result.subaccountId, skipped: result.skipped || false });
  } catch (error: unknown) {
    console.error("squad-subaccount edge function error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate subaccount";
    return jsonResponse({ success: false, error: message }, 400);
  }
});
