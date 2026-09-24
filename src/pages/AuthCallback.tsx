import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumePendingInvite } from "@/pages/JoinWorkspace";
import { planAwareRedirect } from "@/lib/pending-plan";
import { Loader2 } from "lucide-react";

/**
 * AuthCallback – handles the redirect after email verification.
 *
 * Flow:
 *  1. Supabase auto-exchanges the token fragment for a session.
 *  2. We read the session, check onboarding status, and redirect.
 *
 * Redirect rules:
 *  - onboarding_complete = false → /setup
 *  - onboarding_complete = true  → /dashboard
 *  - super_admin                 → /admin/ops-center
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const resolve = async () => {
      // 1. Wait for session (verification token is in the URL hash)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        // No valid session – send to auth page
        navigate("/auth", { replace: true });
        return;
      }

      const userId = session.user.id;

      // 2. Accept pending workspace invite if one exists
      try {
        const token = consumePendingInvite();
        if (token) {
          await supabase.rpc("accept_workspace_invite", {
            p_token: token,
            p_user_id: userId,
          });
        }
      } catch {
        // Non-critical
      }

      // 3. Check super_admin
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "super_admin")
          .maybeSingle();

        if (roleData) {
          navigate("/admin/ops-center", { replace: true });
          return;
        }
      } catch {
        // Non-critical
      }

      // 4. Ensure workspace integrity (with timeout)
      try {
        await Promise.race([
          (supabase.rpc as any)("ensure_workspace_integrity", { p_user_id: userId }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
        ]);
      } catch {
        // Non-critical
      }

      // 5. Record login analytics
      try {
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() } as any)
          .eq("id", userId);

        await (supabase.rpc as any)("increment_login_count", { p_user_id: userId }).catch(() => {});
      } catch {
        // Non-critical
      }

      // 6. Land on billing with the chosen plan preselected, else dashboard
      navigate(planAwareRedirect("/dashboard"), { replace: true });
    };

    // Failsafe: if resolution takes > 6s, force redirect
    const failsafe = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 6000);

    resolve().finally(() => clearTimeout(failsafe));
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-fade-in">
        Signing you in...
      </p>
    </div>
  );
}
