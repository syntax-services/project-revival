import { ComponentType, lazy, LazyExoticComponent } from "react";

/**
 * Robust lazy loading wrapper that catches dynamic import failures (stale chunk errors
 * caused by new production deployments) and automatically reloads the browser to fetch
 * the latest assets.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const sessionKey = "string_chunk_reload_attempted";
    const hasReloaded = sessionStorage.getItem(sessionKey);

    try {
      const component = await componentImport();
      sessionStorage.removeItem(sessionKey);
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("error loading dynamically imported module") ||
        error?.message?.includes("Loading chunk") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && !hasReloaded) {
        sessionStorage.setItem(sessionKey, "true");
        window.location.reload();
        // Return pending promise while browser reloads
        return new Promise<{ default: T }>(() => {});
      }

      sessionStorage.removeItem(sessionKey);
      throw error;
    }
  });
}
