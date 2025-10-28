// Lightweight logging utility with user-friendly toasts
// Extend here with more heuristics-based "self-fixes" when recurring errors are detected

import { toast } from "sonner";

export const logger = {
  info: (msg: string, context?: any) => {
    console.info(msg, context ?? "");
  },
  warn: (msg: string, context?: any) => {
    console.warn(msg, context ?? "");
    toast.message(msg);
  },
  error: (msg: string, err?: any, context?: any) => {
    // Normalize error
    const errorObj = err?.value ?? err ?? {};
    const detail = errorObj?.message || errorObj?.error || String(errorObj);

    console.error(msg, { detail, context });
    toast.error(`${msg}${detail ? `: ${detail}` : ""}`);

    // Example heuristic: detect invalid Odoo field requests and hint a fix
    if (typeof detail === "string" && detail.includes("Invalid field") && detail.includes("x_original_confirmation_date")) {
      toast.message("Autofix: removed x_original_confirmation_date from Odoo queries.");
    }
  },
};
