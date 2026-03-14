import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent stale preview cache in Lovable preview domain
if (typeof window !== "undefined" && "serviceWorker" in navigator && window.location.hostname.includes("lovableproject.com")) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
