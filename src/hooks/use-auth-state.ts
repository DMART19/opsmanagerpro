/**
 * Centralized Auth State Hook
 * 
 * SINGLE SOURCE OF TRUTH for authentication state.
 * Replaces per-component auth listeners to prevent:
 * - Multiple onAuthStateChange subscriptions
 * - Cascading re-renders on TOKEN_REFRESHED
 * - Race conditions between mount/unmount of route guards
 * 
 * This module maintains a singleton auth listener and exposes
 * a React hook that re-renders only on meaningful auth changes.
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthChangeEvent } from "@supabase/supabase-js";
import { setCurrentAuthUserId } from "@/hooks/use-auth-user";
import { clearTaxonomyCache } from "@/components/ui/taxonomy-combobox";

// ─── Singleton State ───

let _currentUser: User | null = null;
let _initialized = false;
let _listeners: Set<(user: User | null) => void> = new Set();
let _subscriptionInstalled = false;
let _lastUserId: string | null = null;

/** Events that represent a real auth change (not just token refresh) */
const MEANINGFUL_EVENTS: AuthChangeEvent[] = [
  "SIGNED_IN",
  "SIGNED_OUT",
  "USER_UPDATED",
  "PASSWORD_RECOVERY",
];

function notifyListeners(user: User | null) {
  _listeners.forEach((fn) => {
    try { fn(user); } catch { /* never break iteration */ }
  });
}

function handleUserChange(user: User | null, queryClientRef?: { clear: () => void }) {
  const nextId = user?.id ?? null;
  const prevId = _lastUserId;

  // User switched or logged out — clear caches
  if (!nextId || (prevId && prevId !== nextId)) {
    queryClientRef?.clear();
    clearTaxonomyCache();
    try { localStorage.removeItem("workspace_context"); } catch { /* ignore */ }
  }

  // Real sign-in always exits demo mode.
  if (nextId) {
    try { sessionStorage.removeItem("omp_tour_active"); } catch { /* ignore */ }
  }

  _lastUserId = nextId;
  _currentUser = user;
  setCurrentAuthUserId(nextId);
  notifyListeners(user);
}

/**
 * Initialize the singleton auth listener.
 * Call once from App.tsx. Idempotent.
 */
export function initAuthListener(queryClient: { clear: () => void }) {
  if (_subscriptionInstalled) return;
  _subscriptionInstalled = true;

  // 1. Seed from current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!_initialized) {
      _initialized = true;
      handleUserChange(session?.user ?? null, queryClient);
    }
  });

  // 2. Listen for changes — filter to meaningful events only
  supabase.auth.onAuthStateChange((event, session) => {
    // TOKEN_REFRESHED with no session = expired session, sign out
    if (event === "TOKEN_REFRESHED" && !session) {
      supabase.auth.signOut().catch(() => {});
      handleUserChange(null, queryClient);
      return;
    }

    // Ignore pure token refreshes — user hasn't changed
    if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      // Still update the user object (new token), but DON'T trigger
      // cascading reloads in contexts. Just keep the reference fresh.
      if (session?.user) {
        _currentUser = session.user;
        setCurrentAuthUserId(session.user.id);
      }
      return;
    }

    if (MEANINGFUL_EVENTS.includes(event)) {
      _initialized = true;
      handleUserChange(session?.user ?? null, queryClient);
    }
  });
}

/**
 * React hook — returns current auth user.
 * Re-renders ONLY on meaningful auth state changes (sign in/out).
 */
export function useAuthState(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(_currentUser);
  const [loading, setLoading] = useState(!_initialized);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Sync with current singleton state
    if (_initialized) {
      setUser(_currentUser);
      setLoading(false);
    }

    const listener = (nextUser: User | null) => {
      if (mountedRef.current) {
        setUser(nextUser);
        setLoading(false);
      }
    };

    _listeners.add(listener);

    return () => {
      mountedRef.current = false;
      _listeners.delete(listener);
    };
  }, []);

  return { user, loading };
}

/** Get current user synchronously (for non-React code) */
export function getCurrentUser(): User | null {
  return _currentUser;
}

/** Check if auth has been initialized */
export function isAuthInitialized(): boolean {
  return _initialized;
}
