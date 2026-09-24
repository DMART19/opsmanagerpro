import { Users, Rocket, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const TrustSignalsSection = () => {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <Rocket className="h-3.5 w-3.5" />
            Growing Community
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Join Teams Already Using OpsManagerPro
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Operations teams across industries trust OpsManagerPro to keep their work organized and their teams aligned.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-6 rounded-xl bg-card border border-border/50">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">250</div>
            <p className="text-sm text-muted-foreground">Assets on Core plan</p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card border border-border/50">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">1,000</div>
            <p className="text-sm text-muted-foreground">Assets on Pro plan</p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card border border-border/50">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">Free</div>
            <p className="text-sm text-muted-foreground">To get started</p>
          </div>
        </div>
      </div>
    </section>
  );
};
