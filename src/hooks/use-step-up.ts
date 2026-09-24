import { useCallback, useState } from "react";
import {
  isStepUpFresh,
  performStepUp,
  type StepUpRequest,
} from "@/lib/auth/step-up";
import { supabase } from "@/integrations/supabase/client";
import type { SensitiveAction } from "@/config/security";

interface PendingAction {
  action: SensitiveAction;
  email: string;
  resolve: () => void;
  reject: (err: unknown) => void;
}

/**
 * Gate an async action behind step-up authentication.
 * Returns a `require()` function and props to spread into <StepUpAuthDialog />.
 */
export function useStepUp() {
  const [pending, setPending] = useState<PendingAction | null>(null);

  const require = useCallback(
    async (action: SensitiveAction): Promise<void> => {
      if (isStepUpFresh()) return;
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";
      return new Promise<void>((resolve, reject) => {
        setPending({ action, email, resolve, reject });
      });
    },
    [],
  );

  const submit = useCallback(
    async (params: { password?: string; totpCode?: string }) => {
      if (!pending) return;
      const req: StepUpRequest = {
        action: pending.action,
        email: pending.email,
        password: params.password,
        totpCode: params.totpCode,
      };
      await performStepUp(req);
      pending.resolve();
      setPending(null);
    },
    [pending],
  );

  const cancel = useCallback(() => {
    if (!pending) return;
    pending.reject(new Error("Step-up cancelled"));
    setPending(null);
  }, [pending]);

  return {
    require,
    dialogProps: {
      open: Boolean(pending),
      action: pending?.action,
      email: pending?.email ?? "",
      onSubmit: submit,
      onCancel: cancel,
    },
  };
}