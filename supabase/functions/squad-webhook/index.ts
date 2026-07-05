import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-squad-signature",
};

interface SquadWebhookEvent {
  event: string;
  transaction_ref: string;
  body: {
    amount: number;
    email: string;
    status: string;
    transaction_ref: string;
    meta?: {
      order_id?: string;
      job_id?: string;
      user_id?: string;
      type?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

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

    const signature = req.headers.get("x-squad-signature");
    const textBody = await req.text();

    if (!signature) {
      if (Deno.env.get("SQUAD_WEBHOOK_ALLOW_INSECURE") === "true") {
        console.warn("Missing x-squad-signature header; insecure webhook acceptance is enabled for sandbox testing");
      } else {
        console.error("Missing x-squad-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    if (signature) {
      // HMAC SHA-512 verification using Web Crypto API
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(SQUAD_SECRET_KEY),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(textBody));
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      if (computedHash !== signature.toLowerCase()) {
        console.error("Invalid Squad webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    const event = JSON.parse(textBody) as SquadWebhookEvent;
    console.log("Squad webhook event parsed:", event.event);

    const txRef = event.body?.transaction_ref || event.transaction_ref;
    let meta = event.body?.meta || {};
    const amount = Number(event.body?.amount || 0) / 100; // convert Kobo to NGN

    if (txRef) {
      const { data: existingTx, error: existingTxError } = await supabase
        .from("payment_transactions")
        .select("metadata")
        .eq("paystack_reference", txRef)
        .maybeSingle();

      if (existingTxError) {
        console.error("Error loading existing transaction metadata:", existingTxError);
      }

      const savedMeta = existingTx?.metadata && typeof existingTx.metadata === "object"
        ? existingTx.metadata as Record<string, unknown>
        : {};
      meta = { ...savedMeta, ...meta };

      // 1. Update transaction log
      const { error: txError } = await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          paid_at: new Date().toISOString(),
          payment_method: "squad",
          metadata: {
            ...meta,
            provider_event: event,
          },
        })
        .eq("paystack_reference", txRef);

      if (txError) {
        console.error("Error updating transaction log:", txError);
      }

      // 2. Handle Wallet Funding
      if (meta.type === "funding" && meta.user_id) {
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("wallet_balance, total_funded")
          .eq("user_id", meta.user_id)
          .single();

        if (!profErr && profile) {
          const currentBal = Number(profile.wallet_balance || 0);
          const currentFunded = Number(profile.total_funded || 0);
          await supabase
            .from("profiles")
            .update({
              wallet_balance: currentBal + amount,
              total_funded: currentFunded + amount,
            })
            .eq("user_id", meta.user_id);

          console.log(`Wallet funded successfully: user_id=${meta.user_id}, amount=₦${amount}`);
        }
      }

      // 3. Handle Order Payment Settlement
      if (meta.order_id) {
        const orderIds = meta.order_id.split(",");
        for (const orderId of orderIds) {
          const trimmedOrderId = orderId.trim();
          if (!trimmedOrderId) continue;

          const { data: order, error: orderError } = await supabase
            .from("orders")
            .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
            .eq("id", trimmedOrderId)
            .eq("status", "pending")
            .select("customer_id, business_id, id")
            .maybeSingle();

          if (orderError) {
            console.error(`Error updating order ${trimmedOrderId}:`, orderError);
            continue;
          }

          if (order) {
            try {
              // Fetch business wallet and credit funds
              const { data: business } = await supabase
                .from("businesses")
                .select("user_id, company_name")
                .eq("id", order.business_id)
                .single();

              const { data: cust } = await supabase
                .from("customers")
                .select("user_id")
                .eq("id", order.customer_id)
                .single();

              const { data: orderDetails } = await supabase
                .from("orders")
                .select("total, commission_amount, platform_fee")
                .eq("id", order.id)
                .single();

              if (orderDetails && business) {
                const total = Number(orderDetails.total || 0);
                const deductions = Number(orderDetails.commission_amount || 0) + Number(orderDetails.platform_fee || 0);
                const netAmount = total - deductions;

                if (netAmount > 0) {
                  const { data: wallet } = await supabase
                    .from("business_wallets")
                    .select("pending_escrow")
                    .eq("business_id", order.business_id)
                    .maybeSingle();

                  const currentPendingEscrow = Number(wallet?.pending_escrow || 0);

                  await supabase
                    .from("business_wallets")
                    .upsert({
                      business_id: order.business_id,
                      pending_escrow: currentPendingEscrow + netAmount,
                      updated_at: new Date().toISOString()
                    }, { onConflict: "business_id" });
                }
              }

              // Send system notifications
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
              console.error(`Settle error for order ${order.id}:`, settleErr);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const msg = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
