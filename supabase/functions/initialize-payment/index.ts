import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DeliveryType = "pickup" | "standard" | "express";

interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface InitializePaymentRequest {
  email?: string;
  amount?: number;
  orderId?: string;
  businessId?: string;
  items?: CheckoutItem[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  deliveryType?: DeliveryType;
  deliveryAddress?: string | null;
  deliveryInstructions?: string | null;
  platformFee?: number;
  commissionAmount?: number;
  metadata?: Record<string, unknown>;
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCallbackUrl = (req: Request) => {
  const origin = req.headers.get("origin")
    ?? Deno.env.get("PUBLIC_SITE_URL")
    ?? Deno.env.get("SITE_URL");

  if (!origin) {
    throw new Error("No callback origin configured");
  }

  return `${origin.replace(/\/$/, "")}/payment-callback`;
};

const buildDeliveryNotes = (
  deliveryType: DeliveryType | undefined,
  deliveryInstructions: string | null | undefined,
) => {
  const parts = [
    deliveryType ? `Delivery type: ${deliveryType}` : null,
    deliveryInstructions?.trim() ? `Instructions: ${deliveryInstructions.trim()}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
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

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      email,
      amount,
      orderId,
      jobId,
      businessId,
      items = [],
      subtotal,
      deliveryFee,
      total,
      deliveryType,
      deliveryAddress,
      deliveryInstructions,
      platformFee,
      commissionAmount,
      metadata,
    } = await req.json() as (InitializePaymentRequest & { jobId?: string });

    if (!email) {
      throw new Error("Email is required");
    }

    let paymentAmount = asNumber(total ?? amount);
    let resolvedBusinessId = businessId;
    let resolvedPlatformFee = asNumber(platformFee);
    let resolvedCommissionAmount = asNumber(commissionAmount, resolvedPlatformFee);
    let resolvedMetadata = metadata ?? {};

    // Handle Job Payment if jobId is provided
    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*, services(name)")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error("Job not found or inaccessible");
      }

      // Verify customer ownership
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customer || job.customer_id !== customer.id) {
        throw new Error("Unauthorized access to this job");
      }

      if (!job.quoted_price || job.quoted_price <= 0) {
        throw new Error("This job does not have a valid quoted price yet");
      }

      paymentAmount = Number(job.quoted_price);
      resolvedBusinessId = job.business_id;
      
      // Default 10% commission for services for now
      resolvedCommissionAmount = Math.round(paymentAmount * 0.1);
      resolvedPlatformFee = 0; 
      
      resolvedMetadata = {
        ...resolvedMetadata,
        job_id: jobId,
        service_name: job.services?.name || "Service",
      };
    }

    if (paymentAmount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const normalizedDeliveryType = deliveryType ?? "pickup";
    if (!jobId && normalizedDeliveryType !== "pickup" && !deliveryAddress?.trim()) {
      throw new Error("Delivery address is required for delivery orders");
    }

    const safeMetadata = resolvedMetadata && typeof resolvedMetadata === "object" && !Array.isArray(resolvedMetadata)
      ? resolvedMetadata
      : {};

    let resolvedOrderId = orderId ?? null;
    let createdOrderId: string | null = null;

    const isFunding = safeMetadata.type === "funding";
    const isBooster = safeMetadata.type === "booster";
    const isSubscription = safeMetadata.type === "subscription";
    const isNonOrderPayment = isFunding || isBooster || isSubscription;

    // Only create a new order if it's NOT a job payment, NOT a non-order payment (booster/funding/subscription), and NO orderId is provided
    if (!jobId && !resolvedOrderId && !isNonOrderPayment) {
      if (!resolvedBusinessId) {
        throw new Error("Business ID is required");
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("At least one checkout item is required");
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (customerError || !customer) {
        throw new Error("Customer profile is incomplete");
      }

      const normalizedItems = items.map((item) => ({
        product_id: item.productId,
        productId: item.productId,
        name: item.name,
        quantity: asNumber(item.quantity),
        price: asNumber(item.price),
        total: asNumber(item.price) * asNumber(item.quantity),
      }));

      const calculatedSubtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
      const normalizedSubtotal = asNumber(subtotal, calculatedSubtotal);
      const normalizedDeliveryFee = asNumber(deliveryFee);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          business_id: resolvedBusinessId,
          customer_id: customer.id,
          status: "pending",
          items: normalizedItems,
          subtotal: normalizedSubtotal,
          delivery_fee: normalizedDeliveryFee,
          platform_fee: resolvedPlatformFee,
          commission_amount: resolvedCommissionAmount,
          total: paymentAmount,
          delivery_address: normalizedDeliveryType === "pickup" ? null : deliveryAddress?.trim() ?? null,
          delivery_notes: buildDeliveryNotes(normalizedDeliveryType, deliveryInstructions),
        })
        .select("id")
        .single();

      if (orderError || !order) {
        throw new Error("Failed to create order");
      }

      resolvedOrderId = order.id;
      createdOrderId = order.id;
    }

    const amountInKobo = Math.round(paymentAmount * 100);
    const transactionRef = `squad_tx_${Math.random().toString(36).substring(2)}${Date.now()}`;

    // Get user's profile to see if they have a squad subaccount
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("squad_subaccount_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let squadSubaccountId = userProfile?.squad_subaccount_id || null;
    let squadSubaccountError: string | null = null;
    if (!squadSubaccountId) {
      try {
        const subaccountResponse = await fetch(`${supabaseUrl}/functions/v1/squad-subaccount`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.id }),
        });

        const subaccountText = await subaccountResponse.text();
        let subaccountData: { success?: boolean; subaccountId?: string; error?: string } = {};
        try {
          subaccountData = JSON.parse(subaccountText);
        } catch {
          throw new Error(`Squad subaccount returned invalid response (${subaccountResponse.status}): ${subaccountText.slice(0, 200)}`);
        }

        if (!subaccountResponse.ok || !subaccountData.success || !subaccountData.subaccountId) {
          throw new Error(subaccountData.error || `Failed to create Squad subaccount (${subaccountResponse.status})`);
        }

        squadSubaccountId = subaccountData.subaccountId;
      } catch (error) {
        squadSubaccountError = error instanceof Error ? error.message : "Failed to create Squad subaccount";
        console.warn(`Continuing payment without Squad subaccount for user ${user.id}: ${squadSubaccountError}`);
      }
    }

    const requestBody: any = {
      email,
      amount: amountInKobo,
      currency: "NGN",
      initiate_type: "inline",
      transaction_ref: transactionRef,
      callback_url: getCallbackUrl(req),
    };

    if (squadSubaccountId) {
      requestBody.subaccount_id = squadSubaccountId;
    }

    console.log("Sending to Squad API:", JSON.stringify(requestBody));

    const squadResponse = await fetch("https://api-d.squadco.com/transaction/initiate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const squadRawText = await squadResponse.text();
    console.log(`Squad API response (${squadResponse.status}):`, squadRawText);

    let squadData: {
      status: number;
      success: boolean;
      message?: string;
      data?: {
        checkout_url: string;
        transaction_ref: string;
        merchant_id: string;
      };
    };

    try {
      squadData = JSON.parse(squadRawText);
    } catch (_) {
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }
      throw new Error(`Squad returned invalid response (HTTP ${squadResponse.status}): ${squadRawText.substring(0, 200)}`);
    }

    if (!squadResponse.ok || !squadData.success || !squadData.data) {
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }
      throw new Error(squadData.message || `Squad payment failed (HTTP ${squadResponse.status})`);
    }

    // Build transaction record — omit order_id for wallet funding
    const txRecord: Record<string, unknown> = {
      user_id: user.id,
      amount: paymentAmount,
      currency: "NGN",
      status: "pending",
      paystack_reference: squadData.data.transaction_ref || transactionRef,
      paystack_access_code: squadData.data.merchant_id,
      metadata: {
        initialized_at: new Date().toISOString(),
        order_id: resolvedOrderId,
        job_id: jobId ?? null,
        user_id: user.id,
        delivery_type: normalizedDeliveryType,
        payment_gateway: "squad",
        squad_subaccount_id: squadSubaccountId,
        squad_subaccount_error: squadSubaccountError,
        provider_transaction_ref: squadData.data.transaction_ref || transactionRef,
        ...(isFunding ? { type: "funding" } : {}),
        ...safeMetadata,
      },
    };
    if (resolvedOrderId) {
      txRecord.order_id = resolvedOrderId;
    }

    const { error: txError } = await supabase.from("payment_transactions").insert(txRecord);

    if (txError) {
      console.error("Failed to insert payment_transactions:", txError);
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }
      throw new Error(`Failed to store payment transaction: ${txError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: squadData.data.checkout_url,
        access_code: squadData.data.merchant_id,
        reference: squadData.data.transaction_ref,
        order_id: resolvedOrderId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Payment initialization error:", error);
    const message = error instanceof Error ? error.message : "Payment initialization failed";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
