import { User, ShieldPlus, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MobileQuickActionsSheetProps {
  employee: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewProfile: (employee: any) => void;
  onAddCredential: (employee: any) => void;
  onRenewCredential: (employee: any) => void;
  onEditMember: (employee: any) => void;
}

export const MobileQuickActionsSheet = ({
  employee,
  open,
  onOpenChange,
  onViewProfile,
  onAddCredential,
  onRenewCredential,
  onEditMember,
}: MobileQuickActionsSheetProps) => {
  if (!employee) return null;

  const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const stats = employee.requirements_stats || {};
  const hasExpiring = (stats.expiring_soon ?? 0) > 0;
  const hasMissing = (stats.missing_expired ?? 0) > 0;

  const handleAction = (action: (emp: any) => void) => {
    onOpenChange(false);
    // Small delay so sheet closes before dialog opens
    setTimeout(() => action(employee), 150);
  };

  const actions = [
    {
      label: "View Profile",
      icon: User,
      onClick: () => handleAction(onViewProfile),
      className: "",
    },
    {
      label: "Add Credential",
      icon: ShieldPlus,
      onClick: () => handleAction(onAddCredential),
      className: "",
    },
    {
      label: "Renew Credential",
      icon: RefreshCw,
      onClick: () => handleAction(onRenewCredential),
      badge: hasExpiring || hasMissing,
      badgeColor: hasMissing ? "bg-destructive" : "bg-amber-500",
      className: "",
    },
    {
      label: "Edit Member",
      icon: Pencil,
      onClick: () => handleAction(onEditMember),
      className: "",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-background shadow-sm">
              {employee.avatar_url && (
                <AvatarImage src={employee.avatar_url} alt={fullName} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="text-left text-base">{fullName}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">
                {employee.position || "No position"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-1 pt-1">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className={cn(
                "w-full justify-start h-13 text-[15px] font-medium rounded-xl gap-3",
                action.className
              )}
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5 text-muted-foreground" />
              {action.label}
              {action.badge && (
                <span className={cn(
                  "ml-auto h-2 w-2 rounded-full flex-shrink-0",
                  action.badgeColor
                )} />
              )}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
