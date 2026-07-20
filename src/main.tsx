import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent stale preview/production PWA cache from serving old WhatsApp links
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const hostname = window.location.hostname;
  if (hostname.includes("lovableproject.com") || hostname.includes("lovable.app") || hostname === "rosadelis.com" || hostname.includes("localhost")) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
