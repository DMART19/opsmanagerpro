import { Package, Layers, Scale, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PalletMetricsBarProps {
  totalTypes: number;
  activePallets: number;
  totalCapacity: number;
  usedCapacity: number;
}

export const PalletMetricsBar = ({
  totalTypes,
  activePallets,
  totalCapacity,
  usedCapacity,
}: PalletMetricsBarProps) => {
  const utilizationPercent = totalCapacity > 0 
    ? Math.round((usedCapacity / totalCapacity) * 100) 
    : 0;

  const metrics = [
    {
      label: "Pallet Types",
      value: totalTypes,
      icon: Package,
      description: "Defined specifications",
    },
    {
      label: "Active Pallets",
      value: activePallets,
      icon: Layers,
      description: "Currently in warehouse",
    },
    {
      label: "Total Capacity",
      value: `${totalCapacity.toLocaleString()} lbs`,
      icon: Scale,
      description: "Combined max weight",
    },
    {
      label: "Utilization",
      value: `${utilizationPercent}%`,
      icon: TrendingUp,
      description: `${usedCapacity.toLocaleString()} / ${totalCapacity.toLocaleString()} lbs`,
      highlight: utilizationPercent > 80,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {metric.label}
                </p>
                <p className={`text-2xl font-semibold ${metric.highlight ? 'text-amber-500' : ''}`}>
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
