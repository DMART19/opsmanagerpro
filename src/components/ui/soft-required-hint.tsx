/**
 * SoftRequiredHint — Inline passive warning for soft-required fields
 * 
 * Shows a subtle amber hint below a field when it's empty.
 * Disappears immediately when the field is filled.
 * No layout shifting — uses min-height reservation.
 */

import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface SoftRequiredHintProps {
  /** Whether the field is currently empty */
  show: boolean;
  /** Guidance message */
  message: string;
  className?: string;
}

export const SoftRequiredHint = ({ show, message, className }: SoftRequiredHintProps) => {
  if (!show) return null;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 mt-1.5 text-xs leading-relaxed",
        "text-warning animate-in fade-in-0 duration-200",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
};
