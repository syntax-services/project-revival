import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    channel?: string;
    metadata?: {
      order_id?: string;
      job_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

serve(async (req) => {
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

    // Verify webhook signature (CRITICAL for production security)
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (!signature) {
      console.error("Missing x-paystack-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // HMAC SHA-512 verification using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (computedHash !== signature.toLowerCase()) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const event = JSON.parse(body) as PaystackWebhookEvent;
    console.log("Paystack webhook event:", event.event);

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;

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

      // Update order status — promote from "pending" (Awaiting Payment) to "confirmed"
      if (metadata?.order_id) {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("id", metadata.order_id)
          .eq("status", "pending")
          .select("customer_id, business_id, id")
          .single();

        if (orderError) {
          console.error("Error updating order:", orderError);
        } else if (order) {
          // Success! Now handle financial settlement and notifications
          try {
            // Get business details including wallet info
            const { data: business } = await supabase
              .from("businesses")
              .select("user_id, company_name")
              .eq("id", order.business_id)
              .single();

            // Get customer user_id
            const { data: cust } = await supabase
              .from("customers")
              .select("user_id")
              .eq("id", order.customer_id)
              .single();

            // Update Business Wallet: Increment pending_balance
            // We use the commission_amount stored in the order to calculate net payout
            const { data: orderDetails } = await supabase
              .from("orders")
              .select("total, commission_amount, platform_fee")
              .eq("id", order.id)
              .single();

            if (orderDetails && business) {
              const total = Number(orderDetails.total || 0);
              // Standardized Fee Model: platform_fee + commission_amount represents the total platform take.
              // For product orders, platform_fee is typically 0 while commission_amount handles the take.
              const totalDeductions = Number(orderDetails.commission_amount || 0) + Number(orderDetails.platform_fee || 0);
              const netAmount = total - totalDeductions;

              if (netAmount > 0) {
                const { data: wallet } = await supabase
                  .from("business_wallets")
                  .select("pending_balance")
                  .eq("business_id", order.business_id)
                  .maybeSingle();

                const currentPending = Number(wallet?.pending_balance || 0);
                
                await supabase
                  .from("business_wallets")
                  .upsert({
                    business_id: order.business_id,
                    pending_balance: currentPending + netAmount,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'business_id' });
              }
            }

            const notifications = [];
            
            if (business?.user_id) {
              notifications.push({
                user_id: business.user_id,
                title: "New Paid Order",
                message: `You have a new paid order #${order.id.slice(0, 8)}. Check your orders dashboard to start processing.`,
                type: "order",
                data: { order_id: order.id }
              });
            }

            if (cust?.user_id) {
              notifications.push({
                user_id: cust.user_id,
                title: "Payment Successful",
                message: `Your payment to ${business?.company_name || 'the business'} was successful. Your order #${order.id.slice(0, 8)} is now confirmed.`,
                type: "order",
                data: { order_id: order.id }
              });
            }

            if (notifications.length > 0) {
              await supabase.from("notifications").insert(notifications);
            }
          } catch (settleErr) {
            console.error("Error in financial/notification settlement:", settleErr);
          }
        }
      }

      // Update job status — promote from "quoted" to "accepted"
      if (metadata?.job_id) {
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .update({ 
            status: "accepted", 
            accepted_at: new Date().toISOString() 
          })
          .eq("id", metadata.job_id)
          .eq("status", "quoted")
          .select("customer_id, business_id, id, quoted_price")
          .single();

        if (jobError) {
          console.error("Error updating job:", jobError);
        } else if (job) {
          try {
            const { data: business } = await supabase
              .from("businesses")
              .select("user_id, company_name")
              .eq("id", job.business_id)
              .single();

            const { data: cust } = await supabase
              .from("customers")
              .select("user_id")
              .eq("id", job.customer_id)
              .single();

            // Settle job payment (10% platform commission)
            const total = Number(job.quoted_price || 0);
            const commission = Math.round(total * 0.1);
            const netAmount = total - commission;

            if (netAmount > 0) {
              const { data: wallet } = await supabase
                .from("business_wallets")
                .select("pending_balance")
                .eq("business_id", job.business_id)
                .maybeSingle();

              const currentPending = Number(wallet?.pending_balance || 0);
              
              await supabase
                .from("business_wallets")
                .upsert({
                  business_id: job.business_id,
                  pending_balance: currentPending + netAmount,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'business_id' });
            }

            const notifications = [];
            
            if (business?.user_id) {
              notifications.push({
                user_id: business.user_id,
                title: "Quote Paid! 🛠️",
                message: `Customer paid the ₦${total.toLocaleString()} quote for job #${job.id.slice(0, 8)}. You can now start the work.`,
                type: "job",
                data: { job_id: job.id }
              });
            }

            if (cust?.user_id) {
              notifications.push({
                user_id: cust.user_id,
                title: "Job Payment Successful! ✅",
                message: `Your payment to ${business?.company_name || 'the provider'} was successful. Job #${job.id.slice(0, 8)} is now active.`,
                type: "job",
                data: { job_id: job.id }
              });
            }

            if (notifications.length > 0) {
              await supabase.from("notifications").insert(notifications);
            }
          } catch (settleErr) {
            console.error("Error in job settlement:", settleErr);
          }
        }
      }

      console.log("Payment successful:", reference);
    }

    if (event.event === "charge.failed") {
      const { reference, metadata } = event.data;

      await supabase
        .from("payment_transactions")
        .update({ status: "failed", metadata: event.data })
        .eq("paystack_reference", reference);

      // Orders do not support a "failed" status, so cancel the draft order instead.
      if (metadata?.order_id) {
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancel_reason: "Payment failed",
          })
          .eq("id", metadata.order_id)
          .eq("status", "pending");
      }

      console.log("Payment failed:", reference);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
