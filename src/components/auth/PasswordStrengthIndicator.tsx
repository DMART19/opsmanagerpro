/**
 * PasswordStrengthIndicator - Visual password strength feedback
 * 
 * Shows strength bar and requirements checklist during signup.
 * Apple-style calm, progressive disclosure.
 */

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  show = true 
}: PasswordStrengthIndicatorProps) => {
  const requirements = useMemo((): Requirement[] => [
    { label: "12+ characters", met: password.length >= 12 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "bg-muted" };
    if (metCount <= 2) return { level: 1, label: "Weak", color: "bg-destructive" };
    if (metCount <= 3) return { level: 2, label: "Fair", color: "bg-warning" };
    if (metCount <= 4) return { level: 3, label: "Good", color: "bg-primary" };
    return { level: 4, label: "Strong", color: "bg-success" };
  }, [requirements]);

  if (!show || password.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          {strength.label && (
            <span className={cn(
              "font-medium transition-colors duration-200",
              strength.level === 1 && "text-destructive",
              strength.level === 2 && "text-warning",
              strength.level === 3 && "text-primary",
              strength.level === 4 && "text-success",
            )}>
              {strength.label}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300 ease-apple",
                level <= strength.level ? strength.color : "bg-muted/60"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist - only show if not all met */}
      {strength.level < 4 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {requirements.map((req) => (
            <div
              key={req.label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-200",
                req.met ? "text-success" : "text-muted-foreground"
              )}
            >
              {req.met ? (
                <Check className="h-3 w-3 flex-shrink-0" strokeWidth={2.5} />
              ) : (
                <X className="h-3 w-3 flex-shrink-0 opacity-40" strokeWidth={2} />
              )}
              <span className={cn(req.met && "line-through opacity-60")}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
