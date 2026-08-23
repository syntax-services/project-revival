import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SquadPaymentOptions {
  amount: number;
  email: string;
  metadata?: Record<string, unknown>;
  onSuccess?: () => Promise<void> | void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export function useSquadPayment() {
  const [isLoading, setIsLoading] = useState(false);

  const initializePayment = async ({
    amount,
    email,
    metadata = {},
    onSuccess,
    onClose,
    onError,
  }: SquadPaymentOptions) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          amount,
          total: amount,
          email,
          metadata: {
            ...metadata,
            source: "string_web_app",
          },
        },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Redirect user to Squad Hosted Checkout URL
        window.location.href = data.checkout_url;
        return data;
      }

      if (data?.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
        return data.data;
      }

      if (onSuccess) {
        await onSuccess();
      }

      return data;
    } catch (err: any) {
      console.error("Squad payment initialization error:", err);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setIsLoading(false);
      if (onClose) {
        onClose();
      }
    }
  };

  return {
    initializePayment,
    isLoading,
  };
}
