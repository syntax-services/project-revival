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

    const diditApiKey = Deno.env.get("DIDIT_API_KEY");
    if (!diditApiKey) {
      console.warn("DIDIT_API_KEY is not configured in Supabase. Falling back to mock verification.");
      
      // Generate a mock verification session URL that redirects to callback with mock query parameters
      const mockSessionId = "mock_didit_session_" + Math.random().toString(36).substr(2, 9);
      const redirectUrl = new URL(callback);
      redirectUrl.searchParams.set("verificationSessionId", mockSessionId);
      redirectUrl.searchParams.set("status", "Approved");
      
      // Auto-approve in database for demo purposes when DIDIT_API_KEY is missing
      if (session_kind === "business") {
        await supabase
          .from("businesses")
          .update({ verified: true, verification_tier: "verified" })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("profiles")
          .update({ verification_level: 2 })
          .eq("user_id", user.id);

        // Also add compliance archive record
        await supabase
          .from("immutable_kyc_archive")
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || 'Demo User',
            email: user.email || 'demo@string.me',
            verification_level: 2
          });
      }

      return new Response(
        JSON.stringify({ 
          url: redirectUrl.toString(), 
          session_id: mockSessionId,
          is_mock: true 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Call Didit API to create session
    console.log(`Initiating Didit session for user ${user.id} (${session_kind})`);
    
    // Map internal session_kind to Didit's kinds: business -> business, customer -> individual
    const diditKind = session_kind === "business" ? "business" : "individual";

    const response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${diditApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        vendor_data: user.id,
        callback: callback,
        session_kind: diditKind
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Didit API returned error: ${response.status} - ${errText}`);
      throw new Error(`Didit API failed: ${errText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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
