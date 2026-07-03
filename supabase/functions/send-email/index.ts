import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      throw new Error("Missing recipient (to), subject, or html body");
    }

    console.log(`Sending email to ${to} via Resend. Subject: ${subject}`);

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured in the environment. Simulating success in sandbox.");
      return new Response(
        JSON.stringify({ success: true, message: "Email send simulated (sandbox)" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "String <support@string.com.ng>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.message || "Resend API error");
    }

    return new Response(
      JSON.stringify({ success: true, id: resData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("send-email edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send email" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
