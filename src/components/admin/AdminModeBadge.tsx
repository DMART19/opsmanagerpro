import { Shield } from "lucide-react";
import { useSuperAdmin } from "@/hooks/use-super-admin";

export const AdminModeBadge = () => {
  const { isSuperAdmin } = useSuperAdmin();

  if (!isSuperAdmin) return null;

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-destructive-foreground shadow-lg backdrop-blur-sm">
      <Shield className="h-3 w-3" />
      Platform Admin Mode
    </div>
  );
};
