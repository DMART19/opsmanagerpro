/**
 * TourModeContext — single source of truth for the public /tour walkthrough.
 * Replaces the legacy DemoContext entirely.
 *
 * `isTourMode` is TRUE when either:
 *   1. The URL contains `?tour=1` (or pathname starts with `/tour`)
 *   2. `sessionStorage.omp_tour_active === "1"`
 *
 * Rule (2) makes the tour self-healing: if any internal Link or navigate
 * accidentally drops the query param, the next render still sees
 * `isTourMode === true`, route guards stay open, and a normalizing
 * effect immediately re-appends `?tour=1` to the URL.
 */
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DemoDataProvider } from "./DemoDataContext";

export const TOUR_STORAGE_KEY = "omp_tour_active";
const TOUR_STEP_STORAGE_KEY = "omp_tour_step";

interface TourModeContextValue {
  isTourMode: boolean;
  /** Back-compat alias — prefer `isTourMode`. */
  isDemo: boolean;
  /** Append `?tour=1` to `path` when in tour mode; identity otherwise. */
  withTour: (path: string) => string;
  activateTour: () => void;
  exitTour: () => void;
  endDemo: () => void;
  exitToSignup: () => void;
  exitToLogin: () => void;
  checkRestriction: (_feature?: string) => false;
  sessionId: string | null;
  isDemoSession: boolean;
  isLoading: false;
  startDemo: () => boolean;
}

const TourModeContext = createContext<TourModeContextValue | null>(null);

export const isTourUrl = (pathname: string, search: string): boolean => {
  if (pathname === "/tour" || pathname.startsWith("/tour/")) return true;
  try {
    return new URLSearchParams(search).get("tour") === "1";
  } catch {
    return false;
  }
};

/** Synchronous check usable outside React. */
export const isTourActive = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isTourUrl(window.location.pathname, window.location.search)) return true;
  try {
    return sessionStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const readStorageFlag = (): boolean => {
  try {
    return sessionStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeStorageFlag = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(TOUR_STORAGE_KEY, "1");
    else sessionStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const resetTourStep = () => {
  try { sessionStorage.removeItem(TOUR_STEP_STORAGE_KEY); } catch { /* ignore */ }
};

export const logTour = (event: string, payload: Record<string, unknown> = {}) => {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.debug("[Tour]", event, payload);
};

const defaultValue: TourModeContextValue = {
  isTourMode: false,
  isDemo: false,
  withTour: (p) => p,
  activateTour: () => {},
  exitTour: () => {},
  endDemo: () => {},
  exitToSignup: () => window.location.assign("/auth?mode=signup"),
  exitToLogin: () => window.location.assign("/auth"),
  checkRestriction: () => false,
  sessionId: null,
  isDemoSession: false,
  isLoading: false,
  startDemo: () => false,
};

/** Routes where `?tour=1` is intentionally absent. */
const isTourNeutral = (pathname: string) =>
  pathname === "/" ||
  pathname === "/tour" ||
  pathname.startsWith("/auth") ||
  pathname.startsWith("/legal/");

export const TourModeProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const urlActive = isTourUrl(location.pathname, location.search);
  const storageActive = readStorageFlag();
  const isTourMode = urlActive || storageActive;

  // Persist flag while URL is active.
  useEffect(() => {
    if (urlActive && !storageActive) {
      writeStorageFlag(true);
      logTour("storage:write", { path: location.pathname });
    }
  }, [urlActive, storageActive, location.pathname]);

  // Self-heal: storage on, URL missing the param -> re-attach.
  useEffect(() => {
    if (!storageActive || urlActive) return;
    if (isTourNeutral(location.pathname)) return;
    const sp = new URLSearchParams(location.search);
    sp.set("tour", "1");
    logTour("url:reinject", { path: location.pathname });
    navigate(`${location.pathname}?${sp.toString()}${location.hash}`, {
      replace: true,
    });
  }, [storageActive, urlActive, location.pathname, location.search, location.hash, navigate]);

  const withTour = useCallback(
    (path: string): string => {
      if (!isTourMode) return path;
      const [base, hashPart] = path.split("#");
      const [p, q] = base.split("?");
      const sp = new URLSearchParams(q || "");
      sp.set("tour", "1");
      return `${p}?${sp.toString()}${hashPart ? `#${hashPart}` : ""}`;
    },
    [isTourMode],
  );

  const activateTour = useCallback(() => {
    writeStorageFlag(true);
    resetTourStep();
    logTour("activate", {});
    navigate("/dashboard?tour=1");
  }, [navigate]);

  const exitTour = useCallback(() => {
    writeStorageFlag(false);
    resetTourStep();
    logTour("exit", { reason: "user" });
    navigate("/auth?mode=signup", { replace: true });
  }, [navigate]);

  const value = useMemo<TourModeContextValue>(
    () => ({
      ...defaultValue,
      isTourMode,
      isDemo: isTourMode,
      isDemoSession: isTourMode,
      sessionId: isTourMode ? "tour-session" : null,
      withTour,
      activateTour,
      exitTour,
      endDemo: () => {
        writeStorageFlag(false);
        resetTourStep();
      },
      startDemo: () => {
        activateTour();
        return true;
      },
    }),
    [isTourMode, withTour, activateTour, exitTour],
  );

  const body = isTourMode ? <DemoDataProvider>{children}</DemoDataProvider> : children;

  return <TourModeContext.Provider value={value}>{body}</TourModeContext.Provider>;
};

export const useTourMode = (): TourModeContextValue => {
  const ctx = useContext(TourModeContext);
  return ctx ?? defaultValue;
};

/** Back-compat aliases for callers that haven't been renamed yet. */
export const DemoProvider = TourModeProvider;
export const useDemoContext = useTourMode;
