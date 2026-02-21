import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    // In production, verify the signature using crypto
    // const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(body).digest('hex');
    // if (hash !== signature) throw new Error("Invalid signature");

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;

      // Update payment transaction
      const { error: txError } = await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          paid_at: new Date().toISOString(),
          payment_method: event.data.channel,
          metadata: event.data,
        })
        .eq("paystack_reference", reference);

      if (txError) {
        console.error("Error updating transaction:", txError);
      }

      // Update order status if linked
      if (metadata?.order_id) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("id", metadata.order_id);

        if (orderError) {
          console.error("Error updating order:", orderError);
        }
      }

      console.log("Payment successful:", reference);
    }

    if (event.event === "charge.failed") {
      const { reference } = event.data;

      await supabase
        .from("payment_transactions")
        .update({ status: "failed", metadata: event.data })
        .eq("paystack_reference", reference);

      console.log("Payment failed:", reference);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});