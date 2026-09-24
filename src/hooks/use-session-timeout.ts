import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ACTIVITY_EVENTS,
  clearAbsoluteSessionStart,
  computeTimeoutState,
  ensureAbsoluteSessionStart,
  forceTimeoutSignOut,
  type TimeoutState,
} from "@/lib/auth/session-timeout";

interface UseSessionTimeout {
  state: TimeoutState;
  authed: boolean;
  stayActive: () => void;
}

/**
 * Idle + absolute session timeout tracker.
 * Activity is tracked via DOM events and route changes.
 */
export function useSessionTimeout(): UseSessionTimeout {
  const [authed, setAuthed] = useState(false);
  const [state, setState] = useState<TimeoutState>({
    idleSecondsRemaining: Number.MAX_SAFE_INTEGER,
    absoluteSecondsRemaining: Number.MAX_SAFE_INTEGER,
    warning: false,
  });
  const lastActivityRef = useRef<number>(Date.now());
  const firedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const has = Boolean(data.session?.user);
      setAuthed(has);
      if (has) ensureAbsoluteSessionStart();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const has = Boolean(session?.user);
      setAuthed(has);
      if (event === "SIGNED_OUT") clearAbsoluteSessionStart();
      if (event === "SIGNED_IN") {
        ensureAbsoluteSessionStart();
        lastActivityRef.current = Date.now();
        firedRef.current = false;
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const stayActive = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!authed) return;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    );
    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity),
      );
    };
  }, [authed]);

  useEffect(() => {
    if (authed) lastActivityRef.current = Date.now();
  }, [location.pathname, authed]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      const next = computeTimeoutState(lastActivityRef.current);
      setState(next);
      if (firedRef.current) return;
      if (next.absoluteSecondsRemaining <= 0) {
        firedRef.current = true;
        void forceTimeoutSignOut("absolute");
      } else if (next.idleSecondsRemaining <= 0) {
        firedRef.current = true;
        void forceTimeoutSignOut("idle");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [authed]);

  return { state, authed, stayActive };
}