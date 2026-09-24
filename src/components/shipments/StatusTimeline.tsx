import { CheckCircle2, Circle, Clock, Package, Truck, MapPin, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface StatusTimelineProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  createdAt?: string;
  departureDate?: string;
  arrivalDate?: string;
}

const STATUSES = [
  { 
    id: "Draft", 
    label: "Draft", 
    description: "Preparing shipment",
    icon: FileCheck,
  },
  { 
    id: "In-Transit", 
    label: "In Transit", 
    description: "Shipment on the way",
    icon: Truck,
  },
  { 
    id: "Delivered", 
    label: "Received", 
    description: "Delivery confirmed",
    icon: MapPin,
  },
];

export const StatusTimeline = ({
  currentStatus,
  onStatusChange,
  createdAt,
  departureDate,
  arrivalDate,
}: StatusTimelineProps) => {
  const currentIndex = STATUSES.findIndex(s => s.id === currentStatus);

  const getStatusState = (index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  };

  const getTimestamp = (statusId: string) => {
    switch (statusId) {
      case "Draft":
        return createdAt ? format(new Date(createdAt), "MMM d, h:mm a") : null;
      case "In-Transit":
        return departureDate ? format(new Date(departureDate), "MMM d, h:mm a") : null;
      case "Delivered":
        return arrivalDate ? format(new Date(arrivalDate), "MMM d, h:mm a") : null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Shipment Timeline</h3>
        <Badge variant="outline" className="ml-auto">
          {currentStatus}
        </Badge>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-muted rounded-full">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(currentIndex / (STATUSES.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {STATUSES.map((status, index) => {
            const state = getStatusState(index);
            const Icon = status.icon;
            const timestamp = getTimestamp(status.id);
            const isClickable = index <= currentIndex + 1; // Can only advance one step

            return (
              <button
                key={status.id}
                onClick={() => isClickable && onStatusChange(status.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center text-center transition-all group",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all z-10 bg-background",
                    state === "completed" && "bg-primary border-primary",
                    state === "current" && "bg-primary/10 border-primary ring-4 ring-primary/20",
                    state === "upcoming" && "bg-muted border-muted-foreground/30",
                    isClickable && state !== "completed" && "group-hover:border-primary/50 group-hover:scale-110"
                  )}
                >
                  {state === "completed" ? (
                    <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                  ) : (
                    <Icon className={cn(
                      "h-5 w-5",
                      state === "current" ? "text-primary" : "text-muted-foreground"
                    )} />
                  )}
                </div>
                
                <div className="mt-3 space-y-0.5">
                  <p className={cn(
                    "font-semibold text-sm",
                    state === "completed" && "text-primary",
                    state === "current" && "text-foreground",
                    state === "upcoming" && "text-muted-foreground"
                  )}>
                    {status.label}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[100px]">
                    {status.description}
                  </p>
                  {timestamp && (
                    <p className={cn(
                      "text-xs font-medium mt-1",
                      state === "upcoming" ? "text-muted-foreground" : "text-primary"
                    )}>
                      {timestamp}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Hint */}
      {currentIndex < STATUSES.length - 1 && (
        <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          Click the next step to advance the shipment status
        </p>
      )}
    </div>
  );
};
