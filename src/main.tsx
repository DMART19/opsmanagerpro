import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { enforceHTTPS, enforceContentSecurity } from "@/lib/data-security";
import { installProdLogger } from "@/lib/prod-logger";

// Security: enforce HTTPS and block mixed content in production
enforceHTTPS();
enforceContentSecurity();
installProdLogger();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
