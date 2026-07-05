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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Auth user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authorization token");
    }

    const { session_kind, callback } = await req.json();
    if (!session_kind) {
      throw new Error("session_kind is required ('business' or 'customer')");
    }

    // Check for Didit credentials
    const diditApiKey = Deno.env.get("DIDIT_API_KEY");
    const diditWorkflowId = Deno.env.get("DIDIT_WORKFLOW_ID");

    if (!diditApiKey) {
      throw new Error("DIDIT_API_KEY is not configured");
    }

    if (!diditWorkflowId) {
      throw new Error("DIDIT_WORKFLOW_ID is not configured");
    }

    // Call Didit API v3 to create session
    console.log(`Initiating Didit session for user ${user.id} (${session_kind})`);

    const callbackUrl = callback || `${req.headers.get("origin") || "https://www.string.com.ng"}/customer/profile`;

    // Build the request body for Didit v3
    const diditBody: Record<string, unknown> = {
      vendor_data: user.id,
      callback: callbackUrl,
    };

    diditBody.workflow_id = diditWorkflowId;

    const response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "x-api-key": diditApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(diditBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Didit API returned error: ${response.status} - ${errText}`);
      throw new Error(`Didit API failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    // The Didit v3 API returns { session_id, url } for the verification page
    return new Response(JSON.stringify({
      url: data.url || data.verification_url || data.session_url,
      session_id: data.session_id || data.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Failed to create Didit session:", error);
    return new Response(JSON.stringify({ error: error.message || error.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
