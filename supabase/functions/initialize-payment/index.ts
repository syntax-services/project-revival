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
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
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

    // Only create a new order if it's NOT a job payment and NO orderId is provided
    if (!jobId && !resolvedOrderId) {
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

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: "NGN",
        callback_url: getCallbackUrl(req),
        metadata: {
          order_id: resolvedOrderId,
          job_id: jobId ?? null,
          user_id: user.id,
          delivery_type: normalizedDeliveryType,
          ...safeMetadata,
        },
      }),
    });

    const paystackData = await paystackResponse.json() as {
      status: boolean;
      message?: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!paystackResponse.ok || !paystackData.status || !paystackData.data) {
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }

      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    const { error: txError } = await supabase.from("payment_transactions").insert({
      user_id: user.id,
      order_id: resolvedOrderId,
      amount: paymentAmount,
      currency: "NGN",
      status: "pending",
      paystack_reference: paystackData.data.reference,
      paystack_access_code: paystackData.data.access_code,
      metadata: {
        initialized_at: new Date().toISOString(),
        delivery_type: normalizedDeliveryType,
      },
    });

    if (txError) {
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }

      throw new Error("Failed to store payment transaction");
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
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
