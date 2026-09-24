/**
 * Lightweight auth user hook for workspace-scoped query keys.
 * Returns the current user ID synchronously from a module-level cache
 * that is updated by the auth state listener in App.tsx.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Module-level cache — updated by auth listener, read by hooks */
let _currentUserId: string | null = null;

/** Called from App.tsx on every auth state change */
export function setCurrentAuthUserId(userId: string | null) {
  _currentUserId = userId;
}

export function getCurrentAuthUserId(): string | null {
  return _currentUserId;
}

/**
 * React hook that returns the current authenticated user ID.
 * Re-renders when auth state changes.
 */
export function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(_currentUserId);

  useEffect(() => {
    // Sync with current value
    setUserId(_currentUserId);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      _currentUserId = id;
      setUserId(id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return userId;
}
