import { cn } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, PackageX } from "lucide-react";

type RiskLevel = "healthy" | "low_stock" | "out_of_stock";

interface RiskStatusBadgeProps {
  quantity: number | null;
  lowThreshold?: number | null;
  criticalThreshold?: number | null;
  className?: string;
}

const getRiskLevel = (
  qty: number | null,
  lowThreshold?: number | null,
  criticalThreshold?: number | null
): RiskLevel => {
  if (qty === null || qty === 0) return "out_of_stock";
  if (criticalThreshold && criticalThreshold > 0 && qty <= criticalThreshold) return "out_of_stock";
  if (lowThreshold && lowThreshold > 0 && qty <= lowThreshold) return "low_stock";
  return "healthy";
};

const RISK_CONFIG: Record<RiskLevel, { label: string; icon: typeof ShieldCheck; className: string }> = {
  healthy: {
    label: "Healthy",
    icon: ShieldCheck,
    className: "text-emerald-700 bg-emerald-50/80 border-emerald-200/60 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/40",
  },
  low_stock: {
    label: "Low Stock",
    icon: AlertTriangle,
    className: "text-amber-700 bg-amber-50/80 border-amber-200/60 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/40",
  },
  out_of_stock: {
    label: "Out of Stock",
    icon: PackageX,
    className: "text-destructive bg-destructive/8 border-destructive/15",
  },
};

export const RiskStatusBadge = ({
  quantity,
  lowThreshold,
  criticalThreshold,
  className,
}: RiskStatusBadgeProps) => {
  const level = getRiskLevel(quantity, lowThreshold, criticalThreshold);
  const config = RISK_CONFIG[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

export { getRiskLevel };
export type { RiskLevel };
