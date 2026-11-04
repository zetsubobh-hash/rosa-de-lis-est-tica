import React from "react";
import ReactDOM from "react-dom/client";
import AdminServices from "@/components/admin/AdminServices";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <AdminServices />
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>
);
