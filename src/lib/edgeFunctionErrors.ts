export async function getEdgeFunctionErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as {
    message?: string;
    context?: Response;
  };

  const response = maybeError?.context;
  if (response) {
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await response.clone().json();
        return body?.error || body?.message || body?.details || maybeError.message || fallback;
      }

      const text = await response.clone().text();
      if (text.trim()) {
        return text.trim();
      }
    } catch (parseError) {
      console.warn("Could not parse Edge Function error response:", parseError);
    }
  }

  return maybeError?.message || fallback;
}

export async function throwEdgeFunctionError(error: unknown, fallback: string): Promise<never> {
  throw new Error(await getEdgeFunctionErrorMessage(error, fallback));
}
