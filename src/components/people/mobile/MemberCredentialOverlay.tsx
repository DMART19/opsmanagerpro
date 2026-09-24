import { useState } from "react";
import { useEmployeeRequirements } from "@/hooks/use-requirements";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Plus, 
  FileText,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AssignCredentialToMemberDialog } from "./AssignCredentialToMemberDialog";

interface MemberCredentialOverlayProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getCredentialStatusConfig = (status: string | null, expireDate: string | null) => {
  const now = new Date();
  
  if (status === 'Expired') {
    return { 
      label: 'Expired', 
      icon: XCircle, 
      className: 'text-destructive',
      bgClassName: 'bg-destructive/10'
    };
  }
  
  if (status === 'Missing' || status === 'Assigned') {
    return { 
      label: 'Assigned', 
      icon: Clock, 
      className: 'text-muted-foreground',
      bgClassName: 'bg-muted/50'
    };
  }
  
  if (status === 'Compliant' && expireDate) {
    const daysUntil = Math.floor((new Date(expireDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 60 && daysUntil >= 0) {
      return { 
        label: `Due in ${daysUntil}d`, 
        icon: Clock, 
        className: 'text-amber-600 dark:text-amber-400',
        bgClassName: 'bg-amber-100 dark:bg-amber-900/30'
      };
    }
  }
  
  return { 
    label: 'Compliant', 
    icon: ShieldCheck, 
    className: 'text-emerald-600 dark:text-emerald-400',
    bgClassName: 'bg-emerald-100 dark:bg-emerald-900/30'
  };
};

export const MemberCredentialOverlay = ({ employee, open, onOpenChange }: MemberCredentialOverlayProps) => {
  const { requirements, loading, refetch } = useEmployeeRequirements(employee?.id);
  const [showAssign, setShowAssign] = useState(false);

  const memberName = employee ? `${employee.first_name} ${employee.last_name}` : "";

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-bold">
              {memberName} — Credentials
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">
              {requirements.length} credential{requirements.length !== 1 ? 's' : ''} assigned
            </p>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4 pb-4" style={{ maxHeight: "60vh" }}>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : requirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">No credentials assigned</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Assign credentials to track compliance.
                </p>
                <Button size="sm" onClick={() => setShowAssign(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Assign Credential
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {requirements.map((req) => {
                  const config = getCredentialStatusConfig(req.status, req.expire_date);
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                    >
                      <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", config.bgClassName)}>
                        <StatusIcon className={cn("h-4 w-4", config.className)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.requirement?.title || "Unknown Credential"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn("text-xs px-1.5 py-0 font-medium", config.className)}>
                            {config.label}
                          </Badge>
                          {req.expire_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(req.expire_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Sticky assign button */}
          {requirements.length > 0 && (
            <div className="p-4 border-t">
              <Button 
                className="w-full" 
                onClick={() => setShowAssign(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Credential
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Assign credential dialog */}
      <AssignCredentialToMemberDialog
        employeeId={employee?.id || ""}
        employeeName={memberName}
        alreadyAssignedIds={requirements.map((r: any) => r.requirement?.id).filter(Boolean)}
        open={showAssign}
        onOpenChange={setShowAssign}
        onSuccess={() => {
          refetch();
          setShowAssign(false);
        }}
      />
    </>
  );
};
