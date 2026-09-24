/**
 * Demo mode removed. Stub kept so legacy call sites compile;
 * routes to a standard success toast.
 */
import { toast } from "sonner";

export const showDemoSaveToast = (actionLabel: string = "Changes") => {
  toast.success(actionLabel);
};
