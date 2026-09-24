import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, Clock } from "lucide-react";

interface SignatureVerificationProps {
  preparedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  status: string;
}

export const SignatureVerification = ({
  preparedBy,
  verifiedBy,
  verifiedAt,
  receivedBy,
  receivedAt,
  status,
}: SignatureVerificationProps) => {
  const getStatusStep = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft": return 1;
      case "in-transit": return 2;
      case "delivered": return 3;
      default: return 1;
    }
  };

  const currentStep = getStatusStep(status);

  return (
    <Card className="shadow-lg border-l-4 border-l-[#2F5FFF] print:break-before-page">
      <CardHeader className="bg-gradient-to-r from-[#2F5FFF] to-[#0D1321] text-white rounded-t-lg">
        <CardTitle className="text-2xl">Signatures & Verification</CardTitle>
        <CardDescription className="text-gray-200 mt-1">
          Chain of custody documentation and status timeline
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Status Timeline */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-4">Shipment Status Timeline</h3>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-[#2F5FFF] transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>
            
            {["Created", "In Transit", "Received"].map((label, idx) => (
              <div key={label} className="flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                  idx + 1 <= currentStep 
                    ? "bg-[#2F5FFF] border-[#2F5FFF]" 
                    : "bg-white border-gray-300"
                }`}>
                  {idx + 1 <= currentStep ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className={`mt-2 text-sm font-medium ${
                  idx + 1 <= currentStep ? "text-[#2F5FFF]" : "text-gray-400"
                }`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Signature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="space-y-2">
            <Label className="text-lg font-semibold flex items-center gap-2">
              Prepared By
              <Badge className="bg-green-500 text-white hover:bg-green-600">Complete</Badge>
            </Label>
            <div className="border-2 border-[#2F5FFF] rounded-lg p-6 min-h-[140px] flex flex-col justify-between bg-gradient-to-br from-[#F6F8FB] to-white">
              <div>
                <p className="font-bold text-lg text-[#0D1321]">{preparedBy}</p>
                <p className="text-sm text-muted-foreground mt-1">Warehouse Staff</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  {format(new Date(), "PPpp")}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-lg font-semibold flex items-center gap-2">
              Verified By
              {verifiedBy ? (
                <Badge className="bg-green-500 text-white hover:bg-green-600">Complete</Badge>
              ) : (
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Pending</Badge>
              )}
            </Label>
            <div className={`border-2 rounded-lg p-6 min-h-[140px] flex flex-col justify-between ${
              verifiedBy 
                ? "border-primary bg-gradient-to-br from-muted/30 to-background" 
                : "border-border/50 bg-muted/20"
            }`}>
              {verifiedBy ? (
                <>
                  <div>
                    <p className="font-bold text-lg text-[#0D1321]">{verifiedBy}</p>
                    <p className="text-sm text-muted-foreground mt-1">Supervisor</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">
                      {verifiedAt && format(new Date(verifiedAt), "PPpp")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Pending verification</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-lg font-semibold flex items-center gap-2">
              Received By
              {receivedBy ? (
                <Badge className="bg-green-500 text-white hover:bg-green-600">Complete</Badge>
              ) : (
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Pending</Badge>
              )}
            </Label>
            <div className={`border-2 rounded-lg p-6 min-h-[140px] flex flex-col justify-between ${
              receivedBy 
                ? "border-primary bg-gradient-to-br from-muted/30 to-background" 
                : "border-border/50 bg-muted/20"
            }`}>
              {receivedBy ? (
                <>
                  <div>
                    <p className="font-bold text-lg text-[#0D1321]">{receivedBy}</p>
                    <p className="text-sm text-muted-foreground mt-1">Destination Contact</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">
                      {receivedAt && format(new Date(receivedAt), "PPpp")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Pending receipt</p>
              )}
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="text-center text-sm text-muted-foreground bg-[#F6F8FB] p-4 rounded-lg border">
          <p className="font-semibold text-[#0D1321] mb-2 text-lg">Warehouse Operations Center</p>
          <p className="mb-1">This manifest certifies the contents and condition of materials listed above.</p>
          <p className="text-xs mt-2 font-medium">Generated: {format(new Date(), "PPpp")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
