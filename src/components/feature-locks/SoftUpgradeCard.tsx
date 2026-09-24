import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { GatedFeature } from "@/contexts/SubscriptionContext";
import { FEATURE_DESCRIPTIONS } from "./feature-descriptions";

interface SoftUpgradeCardProps {
  feature: GatedFeature;
  requiredPlan: string;
}

export const SoftUpgradeCard = ({ feature, requiredPlan }: SoftUpgradeCardProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const desc = FEATURE_DESCRIPTIONS[feature];

  if (dismissed) return null;

  return (
    <div className="relative w-full max-w-sm rounded-xl border bg-card shadow-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">{feature}</h3>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
            {requiredPlan}
          </span>
        </div>
      </div>

      {/* Value prop */}
      <p className="text-sm text-foreground font-medium">{desc.headline}</p>
      <p className="text-sm text-muted-foreground">{desc.value}</p>

      {/* Bullets */}
      <ul className="space-y-1.5">
        {desc.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            {b}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button onClick={() => navigate("/billing")} className="w-full gap-2" size="sm">
        Upgrade Plan
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
