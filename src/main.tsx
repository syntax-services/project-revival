import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global listener for new deployment chunk load failures
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Vite deployment update detected. Reloading for latest version...", event);
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);

