/**
 * Mount inside the authenticated app shell to enforce idle + absolute
 * session timeouts. Renders only the warning dialog when active.
 */

import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { SessionTimeoutWarningDialog } from "./SessionTimeoutWarningDialog";

export function SessionTimeoutManager() {
  const { state, authed, stayActive } = useSessionTimeout();
  if (!authed) return null;
  return (
    <SessionTimeoutWarningDialog
      open={state.warning}
      secondsRemaining={state.idleSecondsRemaining}
      onStay={stayActive}
    />
  );
}