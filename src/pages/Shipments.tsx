import { Truck, Lock, Bell } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Shipments = () => {
  const handleNotifyMe = () => {
    toast.success("You'll be notified when Shipments launches!");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Shipments" },
          ]}
        />

        {/* Coming Soon Card */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full text-center border border-border shadow-sm">
            <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-10 px-4 sm:px-8 space-y-6">
              {/* Icon with Lock */}
              <div className="relative inline-flex">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center">
                  <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
              </div>

              {/* Badge */}
              <Badge variant="secondary" className="text-sm px-4 py-1">
                Coming Soon
              </Badge>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold">Shipments</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Create, track, and manage outbound shipments with full visibility from preparation to delivery.
                </p>
              </div>

              {/* Features Preview */}
              <div className="text-left bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">What's coming:</p>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>• Create and manage shipment manifests</li>
                  <li>• Track shipment status in real-time</li>
                  <li>• Add pallets, cases, and equipment to shipments</li>
                  <li>• Digital signature verification</li>
                  <li>• Export shipping documents & labels</li>
                </ul>
              </div>

              {/* CTA */}
              <Button onClick={handleNotifyMe} className="gap-2">
                <Bell className="h-4 w-4" />
                Notify Me When Available
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <LegalFooter />
    </div>
  );
};

export default Shipments;
