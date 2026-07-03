import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-v2, x-signature, x-signature-simple, x-timestamp",
};

/**
 * Computes HMAC-SHA256 signature for verification.
 */
async function verifySignature(
  message: string,
  signatureHeader: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return computedHash.toLowerCase() === signatureHeader.toLowerCase();
}

/**
 * Stringifies a JSON object recursively sorting keys.
 */
function canonicalStringify(obj: any): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    return `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`;
  });
  return "{" + pairs.join(",") + "}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DIDIT_WEBHOOK_SECRET = Deno.env.get("DIDIT_WEBHOOK_SECRET");
    if (!DIDIT_WEBHOOK_SECRET) {
      throw new Error("DIDIT_WEBHOOK_SECRET is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signatureV2 = req.headers.get("x-signature-v2");
    const signatureV1 = req.headers.get("x-signature");
    const signatureSimple = req.headers.get("x-signature-simple");
    const timestampStr = req.headers.get("x-timestamp");
    const bodyText = await req.text();

    if (!timestampStr) {
      console.error("Missing x-timestamp header");
      return new Response(JSON.stringify({ error: "Missing x-timestamp header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Verify Timestamp Freshness (within 5 minutes / 300 seconds)
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      console.error(`Timestamp out of sync. Now: ${now}, Webhook: ${timestamp}`);
      return new Response(JSON.stringify({ error: "Timestamp out of sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let isVerified = false;

    // 2. Validate using exact raw body bytes (recommended for standard webhooks)
    if (signatureV2) {
      isVerified = await verifySignature(bodyText, signatureV2, DIDIT_WEBHOOK_SECRET);
    }
    if (!isVerified && signatureV1) {
      isVerified = await verifySignature(bodyText, signatureV1, DIDIT_WEBHOOK_SECRET);
    }

    // 3. Fallback: Parse body, recursively sort keys, and verify computed canonical JSON signature
    if (!isVerified && signatureV2) {
      try {
        const parsed = JSON.parse(bodyText);
        const canonicalJson = canonicalStringify(parsed);
        isVerified = await verifySignature(canonicalJson, signatureV2, DIDIT_WEBHOOK_SECRET);
      } catch (e) {
        console.error("Canonical signature validation error:", e);
      }
    }

    // 4. Second Fallback: Validate using X-Signature-Simple
    if (!isVerified && signatureSimple) {
      try {
        const parsed = JSON.parse(bodyText);
        const sessionId = parsed.session_id || parsed.business_session_id || "";
        const simpleString = `${timestampStr}:${sessionId}:${parsed.status}:${parsed.webhook_type}`;
        isVerified = await verifySignature(simpleString, signatureSimple, DIDIT_WEBHOOK_SECRET);
      } catch (e) {
        console.error("Simple signature validation error:", e);
      }
    }

    if (!isVerified) {
      console.error("Invalid webhook signature computed. Raw body length:", bodyText.length);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // 5. Parse and process events
    const payload = JSON.parse(bodyText);
    const { status, webhook_type, vendor_data, session_kind, business_session_id } = payload;
    const isBusiness = session_kind === "business" || !!business_session_id;

    console.log(`Didit Webhook Event: ${webhook_type}, Status: ${status}, IsBusiness: ${isBusiness}, User: ${vendor_data}`);

    if (vendor_data) {
      // Find internal profile ID matching vendor_data (user_id or profile id)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone")
        .or(`user_id.eq.${vendor_data},id.eq.${vendor_data}`)
        .maybeSingle();

      if (profileErr) {
        console.error("Error retrieving user profile:", profileErr);
      } else if (!profile) {
        console.warn(`No user profile found for vendor_data: ${vendor_data}`);
      } else {
        const userId = profile.user_id;

        if (isBusiness) {
          // Process Merchant verification update
          let verified = false;
          let tier: "none" | "verified" | "premium" | "elite" = "none";

          if (status === "Approved") {
            verified = true;
            tier = "verified";
          } else if (status === "Declined") {
            verified = false;
            tier = "none";
          }

          const { error: bizErr } = await supabase
            .from("businesses")
            .update({
              verified,
              verification_tier: tier,
            })
            .eq("user_id", userId);

          if (bizErr) {
            console.error("Error updating business status:", bizErr);
          } else {
            console.log(`Successfully updated business status for user ${userId} to verified: ${verified}`);
          }
        } else {
          // Process Customer / Shopper verification update
          let level = 1;
          if (status === "Approved") {
            level = 2;
          }

          const { error: profileUpdateErr } = await supabase
            .from("profiles")
            .update({
              verification_level: level,
            })
            .eq("user_id", userId);

          if (profileUpdateErr) {
            console.error("Error updating customer verification level:", profileUpdateErr);
          } else {
            console.log(`Successfully updated customer ${userId} verification level to ${level}`);
          }
        }

        // Store compliance audit record if approved
        if (status === "Approved") {
          const { error: archiveErr } = await supabase
            .from("immutable_kyc_archive")
            .insert({
              user_id: userId,
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              verification_level: isBusiness ? 3 : 2,
              created_at: new Date().toISOString(),
            });

          if (archiveErr) {
            console.error("Error archiving approved KYC details:", archiveErr);
          } else {
            console.log("Successfully archived approved KYC verification details.");
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ error: error.message || error.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
