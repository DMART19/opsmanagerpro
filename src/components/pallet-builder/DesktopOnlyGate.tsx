import { Monitor, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DesktopOnlyGate({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className={embedded ? "flex-1 flex items-center justify-center p-6" : "min-h-screen bg-background flex items-center justify-center p-6"}>
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Monitor className="h-10 w-10 text-primary" />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">
              Best experienced on desktop
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Interactive 3D pallet planning uses precise drag-and-drop and detailed visualization — it works best on a larger screen. Open this page from a laptop or desktop to get the full experience.
            </p>
          </div>

          {/* Reason */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              You can still manage inventory, teams, tasks, and shipments from your phone — planning is the only tool that needs a bigger screen.
            </p>
          </div>

          {/* Action */}
          <Button 
            onClick={() => navigate("/dashboard")} 
            className="gap-2"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
    </div>
  );
}
