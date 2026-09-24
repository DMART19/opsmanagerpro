/**
 * Warns the user before automatic idle sign-out.
 * Mounted by SessionTimeoutManager.
 */

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  secondsRemaining: number;
  onStay: () => void;
}

export function SessionTimeoutWarningDialog({
  open,
  secondsRemaining,
  onStay,
}: Props) {
  const [countdown, setCountdown] = useState(secondsRemaining);

  useEffect(() => {
    setCountdown(secondsRemaining);
  }, [secondsRemaining]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Are you still there?
          </AlertDialogTitle>
          <AlertDialogDescription>
            For your security, we’ll sign you out in{" "}
            <span className="font-medium text-foreground">{countdown}</span>{" "}
            seconds due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/auth");
            }}
          >
            Sign out now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStay}>
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}