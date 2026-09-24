/**
 * TourEngine — single, fail-safe public tour engine.
 *
 * Architecture
 * ============
 *  - Mounted once in App.tsx; renders nothing unless `isTourMode` (tour mode).
 *  - Owns a state machine: idle → navigating → polling → anchored | centered.
 *  - All overlay UI is `position: fixed` viewport-relative — no scrollY math,
 *    no document-coord drift on route changes.
 *  - Target resolution uses MutationObserver + IntersectionObserver, capped at
 *    2.5 s. Any failure transitions to a centered fallback tooltip rather than
 *    rendering a broken anchored state ("clean fallback over broken UI").
 *  - Next / Back / Skip / Exit are ALWAYS enabled — they operate on engine
 *    state, not target presence. The user is never trapped.
 *
 * Z-index tokens (no inline overrides anywhere else):
 *    spotlight  9990
 *    tooltip    9995
 *    debug pill 9999
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTourMode, logTour } from "@/contexts/TourModeContext";
import { TOUR_STEPS, type TourStep } from "./steps";

const TOOLTIP_WIDTH_DESKTOP = 360;
const TOOLTIP_MAX_HEIGHT = 360;
const TOOLTIP_MARGIN = 12;
const SPOTLIGHT_PADDING_DESKTOP = 8;
const SPOTLIGHT_PADDING_MOBILE = 6;
const VIEWPORT_INSET = 12;
const TOP_RESERVED = 64; // header / banner clearance
const POLL_TIMEOUT_MS = 2500;
const STEP_STORAGE_KEY = "omp_tour_step";

const readStoredStep = (): number => {
  // A public demo should always start at step 1 on a fresh mount. Persisted
  // resume created stale starts on step 3/8 after route reloads or previews.
  return 0;
};
const writeStoredStep = (n: number) => {
  try { sessionStorage.setItem(STEP_STORAGE_KEY, String(n)); } catch { /* ignore */ }
};
const resetStoredStep = () => {
  try { sessionStorage.removeItem(STEP_STORAGE_KEY); } catch { /* ignore */ }
};

type Phase = "navigating" | "polling" | "anchored" | "centered";

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const useIsMobile = () => {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const onResize = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return m;
};

/** Pick the placement that fits the viewport. Falls back to "auto" = most space. */
function computePlacement(
  anchor: AnchorRect,
  preferred: TourStep["placement"],
  tipW: number,
  tipH: number,
  vw: number,
  vh: number,
): { top: number; left: number; placement: "top" | "bottom" | "left" | "right" } | null {
  const gap = TOOLTIP_MARGIN;
  const candidates: Array<"top" | "bottom" | "left" | "right"> = [];
  const order = (p: TourStep["placement"]): typeof candidates => {
    switch (p) {
      case "top":    return ["top", "bottom", "right", "left"];
      case "bottom": return ["bottom", "top", "right", "left"];
      case "left":   return ["left", "right", "top", "bottom"];
      case "right":  return ["right", "left", "top", "bottom"];
      default:       return ["bottom", "top", "right", "left"];
    }
  };
  candidates.push(...order(preferred));

  for (const side of candidates) {
    let top = 0;
    let left = 0;
    if (side === "top") {
      top = anchor.top - tipH - gap;
      left = anchor.left + anchor.width / 2 - tipW / 2;
    } else if (side === "bottom") {
      top = anchor.top + anchor.height + gap;
      left = anchor.left + anchor.width / 2 - tipW / 2;
    } else if (side === "left") {
      top = anchor.top + anchor.height / 2 - tipH / 2;
      left = anchor.left - tipW - gap;
    } else {
      top = anchor.top + anchor.height / 2 - tipH / 2;
      left = anchor.left + anchor.width + gap;
    }
    // Bounds check (strict)
    const fitsV = top >= TOP_RESERVED + VIEWPORT_INSET && top + tipH <= vh - VIEWPORT_INSET;
    const fitsH = left >= VIEWPORT_INSET && left + tipW <= vw - VIEWPORT_INSET;
    if (fitsV && fitsH) {
      return { top, left, placement: side };
    }
  }
  return null;
}

/** Same as computePlacement but with a final clamp so the tooltip is always
 *  on-screen when we've decided not to fall back to centered. */
function placeAndClamp(
  anchor: AnchorRect,
  preferred: TourStep["placement"],
  tipW: number,
  tipH: number,
  vw: number,
  vh: number,
) {
  // First try strict fit
  const strict = computePlacement(anchor, preferred, tipW, tipH, vw, vh);
  if (strict) return strict;

  // Pick the side with the most space and clamp
  const spaces = {
    top: anchor.top - TOP_RESERVED,
    bottom: vh - (anchor.top + anchor.height),
    left: anchor.left,
    right: vw - (anchor.left + anchor.width),
  };
  const best = (Object.keys(spaces) as Array<keyof typeof spaces>).sort(
    (a, b) => spaces[b] - spaces[a],
  )[0];

  let top = 0;
  let left = 0;
  if (best === "top") {
    top = Math.max(TOP_RESERVED + VIEWPORT_INSET, anchor.top - tipH - TOOLTIP_MARGIN);
    left = anchor.left + anchor.width / 2 - tipW / 2;
  } else if (best === "bottom") {
    top = Math.min(vh - tipH - VIEWPORT_INSET, anchor.top + anchor.height + TOOLTIP_MARGIN);
    left = anchor.left + anchor.width / 2 - tipW / 2;
  } else if (best === "left") {
    top = anchor.top + anchor.height / 2 - tipH / 2;
    left = Math.max(VIEWPORT_INSET, anchor.left - tipW - TOOLTIP_MARGIN);
  } else {
    top = anchor.top + anchor.height / 2 - tipH / 2;
    left = Math.min(vw - tipW - VIEWPORT_INSET, anchor.left + anchor.width + TOOLTIP_MARGIN);
  }

  left = Math.max(VIEWPORT_INSET, Math.min(left, vw - tipW - VIEWPORT_INSET));
  top = Math.max(TOP_RESERVED + VIEWPORT_INSET, Math.min(top, vh - tipH - VIEWPORT_INSET));
  return { top, left, placement: best };
}

/** Returns true when the target rect is meaningful (non-zero, in viewport). */
function isUsableRect(r: DOMRect, vw: number, vh: number): boolean {
  if (r.width < 4 || r.height < 4) return false;
  // Element must intersect viewport at all (after we've scrolled to it).
  if (r.bottom < 0 || r.top > vh) return false;
  if (r.right < 0 || r.left > vw) return false;
  return true;
}

export const TourEngine = () => {
  const { isTourMode, exitTour } = useTourMode();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [stepIndex, setStepIndex] = useState<number>(() => readStoredStep());

  // Persist current step so it survives any transient remount of TourEngine
  // (route-driven context reshuffles, Suspense boundaries, etc.).
  useEffect(() => {
    writeStoredStep(stepIndex);
  }, [stepIndex]);
  const [phase, setPhase] = useState<Phase>("polling");
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [visible, setVisible] = useState(false);

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const targetElRef = useRef<Element | null>(null);
  const moRef = useRef<MutationObserver | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const hasBootstrappedTourRef = useRef(false);
  /** Tracks which step the auto-advance timer was started for, so phase
   *  flips (e.g. ResizeObserver bouncing anchored↔centered on a busy page)
   *  don't reset the timer mid-step and trap the user. */
  const advanceForStepRef = useRef<number>(-1);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  /** Fresh tour sessions always begin at step 1, even if the user lands on a
   *  deep tour URL like /inventory?tour=1 or React refresh preserved old state. */
  useEffect(() => {
    if (!isTourMode) {
      hasBootstrappedTourRef.current = false;
      return;
    }
    if (hasBootstrappedTourRef.current) return;
    hasBootstrappedTourRef.current = true;
    resetStoredStep();
    advanceForStepRef.current = -1;
    if (stepIndex !== 0) setStepIndex(0);
    if (location.pathname !== "/dashboard" && location.pathname !== "/tour" && !location.pathname.startsWith("/tour/")) {
      const sp = new URLSearchParams(location.search);
      sp.set("tour", "1");
      navigate(`/dashboard?${sp.toString()}`, { replace: true });
    }
  }, [isTourMode, location.pathname, location.search, navigate, stepIndex]);

  /** Compute and persist the target's viewport rect. */
  const measure = useCallback(() => {
    const el = targetElRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!isUsableRect(r, vw, vh)) {
      // Transient bad rect (table re-render, scroll, etc.). Keep the previous
      // anchor rather than flipping phase — phase flips would reset the
      // auto-advance timer and trap the user on this step.
      setAnchor((prev) => prev);
      return;
    }
    setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height });
    setPhase("anchored");
  }, []);

  /** Tear down all observers/timers for the current step. */
  const cleanupObservers = useCallback(() => {
    moRef.current?.disconnect();
    moRef.current = null;
    roRef.current?.disconnect();
    roRef.current = null;
    ioRef.current?.disconnect();
    ioRef.current = null;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const exit = useCallback(() => {
    cleanupObservers();
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    logTour("exit", { from: "TourEngine" });
    exitTour();
  }, [cleanupObservers, exitTour]);

  const goTo = useCallback(
    (idx: number) => {
      const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, idx));
      setStepIndex(next);
    },
    [],
  );
  const goNext = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);
  const goPrev = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex]);
  const restart = useCallback(() => {
    logTour("restart", {});
    resetStoredStep();
    advanceForStepRef.current = -1;
    setStepIndex(0);
  }, []);

  /** Effect: resolve target whenever step changes or route settles. */
  useEffect(() => {
    if (!isTourMode) return;
    cleanupObservers();
    targetElRef.current = null;

    // `/tour` is the public entry/reset route. While TourEngine stays mounted
    // across SPA navigation, force a clean step-1 state and let PublicTour send
    // the visitor to the dashboard. This prevents stale step-3 starts/loops.
    if (location.pathname === "/tour" || location.pathname.startsWith("/tour/")) {
      resetStoredStep();
      advanceForStepRef.current = -1;
      if (stepIndex !== 0) setStepIndex(0);
      setPhase("navigating");
      setAnchor(null);
      setVisible(false);
      return;
    }

    // Step has no target → always centered.
    const wantedRoute = step.route;
    const onCorrectRoute = location.pathname === wantedRoute;

    // Cross-route transitions: drop the old spotlight (its element is gone) but
    // keep the tooltip mounted and visible with the upcoming step's content so
    // the user doesn't see a gap/flash while React Router swaps pages
    // (e.g. step 6 /calendar → step 7 /dashboard).
    if (!onCorrectRoute) {
      setAnchor(null);
    }

    logTour("step", {
      index: stepIndex,
      id: step.id,
      wantedRoute,
      onCorrectRoute,
      url: location.pathname + location.search,
    });

    if (!onCorrectRoute) {
      // Treat as "centered" right away — overlay stays visible with the new
      // step's text while navigation + polling happen behind the scenes.
      setPhase("centered");
      // Preserve ?tour=1 so DemoProvider stays active.
      const sp = new URLSearchParams(location.search);
      sp.set("tour", "1");
      navigate(`${wantedRoute}?${sp.toString()}`, { replace: true });
      return;
    }

    const targetKey = (isMobile && step.mobileTarget) || step.target;
    if (!targetKey) {
      // Drop the spotlight cutout but keep the tooltip frame visible.
      setAnchor(null);
      setPhase("centered");
      return;
    }

    const selector = `[data-tour="${targetKey}"]`;
    setPhase("polling");

    const tryFind = () => {
      const el = document.querySelector(selector);
      if (!el) return false;
      targetElRef.current = el;
      // Scroll into view, then measure on the next frame.
      try {
        el.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
      } catch {
        /* ignore */
      }
      // Measure on the next frame — instant scroll means no settle delay.
      requestAnimationFrame(() => {
        measure();
        if ("ResizeObserver" in window) {
          roRef.current = new ResizeObserver(() => measure());
          roRef.current.observe(el);
        }
      });
      return true;
    };

    if (tryFind()) return;

    // Not in DOM yet — observe mutations until it appears or timeout fires.
    moRef.current = new MutationObserver(() => {
      if (tryFind()) {
        moRef.current?.disconnect();
        moRef.current = null;
      }
    });
    moRef.current.observe(document.body, { childList: true, subtree: true });

    timeoutRef.current = window.setTimeout(() => {
      // Fail-safe: never freeze.
      moRef.current?.disconnect();
      moRef.current = null;
      if (!targetElRef.current) {
        logTour("target:timeout", { stepId: step.id, targetKey });
        setPhase("centered");
      }
    }, POLL_TIMEOUT_MS);

    return cleanupObservers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, isTourMode, location.pathname, isMobile]);

  /** Effect: re-measure on scroll / resize while anchored. */
  useEffect(() => {
    if (phase !== "anchored") return;
    let raf = 0;
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure());
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [phase, measure]);

  /** Fade in once the overlay has a stable phase. */
  useLayoutEffect(() => {
    // Keep the tooltip mounted/visible across polling too — a momentary
    // "polling" between two anchored steps would otherwise cause a flash.
    if (phase === "anchored" || phase === "centered" || phase === "polling") {
      setVisible(true);
      return;
    }
    setVisible(false);
  }, [phase, stepIndex]);

  /** Auto-advance timer. */
  useEffect(() => {
    if (!isTourMode) return;
    if (step.isFinal || !step.durationMs) return;
    if (phase !== "anchored" && phase !== "centered") return;
    // Start the timer exactly once per step. Phase oscillations on busy
    // pages must NOT reset the countdown.
    if (advanceForStepRef.current === stepIndex) return;
    advanceForStepRef.current = stepIndex;
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      goNext();
    }, step.durationMs);
  }, [isTourMode, step, phase, stepIndex, goNext]);

  /** Cancel any pending advance when the step index actually changes. */
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [stepIndex]);

  /** Keyboard: ESC exits, arrows navigate. */
  useEffect(() => {
    if (!isTourMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        // Don't hijack when focus is in a form control.
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        if (isLast) exit();
        else goNext();
      } else if (e.key === "ArrowLeft") {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        if (!isFirst) goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTourMode, isLast, isFirst, goNext, goPrev, exit]);

  /** Reset tour index when the user leaves tour mode entirely. */
  useEffect(() => {
    if (!isTourMode) {
      setStepIndex(0);
      resetStoredStep();
      advanceForStepRef.current = -1;
      setPhase("polling");
      setAnchor(null);
      setVisible(false);
    }
  }, [isTourMode]);

  if (!isTourMode) return null;

  // ── Layout calculations ───────────────────────────────────────────────
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const spotlightPad = isMobile ? SPOTLIGHT_PADDING_MOBILE : SPOTLIGHT_PADDING_DESKTOP;

  const tipW = isMobile
    ? Math.min(vw - 24, 420)
    : Math.min(TOOLTIP_WIDTH_DESKTOP, vw - 2 * VIEWPORT_INSET);
  const tipH = TOOLTIP_MAX_HEIGHT;

  // Centered tooltip position
  let tipTop = vh / 2 - tipH / 2;
  let tipLeft = vw / 2 - tipW / 2;
  let arrowSide: "top" | "bottom" | "left" | "right" | null = null;

  let cutout: AnchorRect | null = null;
  if (phase === "anchored" && anchor) {
    cutout = {
      top: anchor.top - spotlightPad,
      left: anchor.left - spotlightPad,
      width: anchor.width + 2 * spotlightPad,
      height: anchor.height + 2 * spotlightPad,
    };

    if (isMobile) {
      // Mobile: bottom sheet, always. Doesn't cover spotlight thanks to padding.
      tipLeft = VIEWPORT_INSET;
      tipTop = vh - tipH - VIEWPORT_INSET;
      // If the spotlight is in the bottom half, push tooltip to the top instead.
      if (anchor.top + anchor.height / 2 > vh / 2) {
        tipTop = TOP_RESERVED + VIEWPORT_INSET;
      }
    } else {
      const placed = placeAndClamp(anchor, step.placement ?? "bottom", tipW, tipH, vw, vh);
      tipTop = placed.top;
      tipLeft = placed.left;
      arrowSide = placed.placement;
    }
  }

  const overlay = (
    <>
      {/*
        Click-shield: absorbs clicks everywhere EXCEPT inside the spotlight cutout.
        Prevents accidental clicks on sidebar Links / page buttons that would
        navigate away from the tour and drop `?tour=1`. Four edge divs form
        a frame around the cutout, leaving it click-through for "Try it".
      */}
      {cutout ? (
        <>
          {/* top */}
          <div
            aria-hidden="true"
            className="fixed left-0 right-0"
            style={{ top: 0, height: Math.max(0, cutout.top), zIndex: 9989, pointerEvents: "auto" }}
          />
          {/* bottom */}
          <div
            aria-hidden="true"
            className="fixed left-0 right-0"
            style={{
              top: cutout.top + cutout.height,
              bottom: 0,
              zIndex: 9989,
              pointerEvents: "auto",
            }}
          />
          {/* left */}
          <div
            aria-hidden="true"
            className="fixed"
            style={{
              top: cutout.top,
              left: 0,
              width: Math.max(0, cutout.left),
              height: cutout.height,
              zIndex: 9989,
              pointerEvents: "auto",
            }}
          />
          {/* right */}
          <div
            aria-hidden="true"
            className="fixed"
            style={{
              top: cutout.top,
              left: cutout.left + cutout.width,
              right: 0,
              height: cutout.height,
              zIndex: 9989,
              pointerEvents: "auto",
            }}
          />
        </>
      ) : (
        // No cutout: absorb every click (centered/explanation step).
        <div
          aria-hidden="true"
          className="fixed inset-0"
          style={{ zIndex: 9989, pointerEvents: "auto" }}
        />
      )}

      {/* SVG dim mask with cutout (spotlight) — pointer-events: none so clicks pass through */}
      <svg
        aria-hidden="true"
        className={cn(
          "fixed inset-0 pointer-events-none transition-opacity duration-150 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{ zIndex: 9990 }}
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.left}
                y={cutout.top}
                width={cutout.width}
                height={cutout.height}
                rx={8}
                ry={8}
                fill="black"
              />
            )}
          </mask>
          <filter id="tour-spotlight-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="#000"
          fillOpacity={0.78}
          mask="url(#tour-spotlight-mask)"
        />
        {cutout && (
          <>
            {/* Outer pulsing glow ring */}
            <rect
              x={cutout.left - 3}
              y={cutout.top - 3}
              width={cutout.width + 6}
              height={cutout.height + 6}
              rx={11}
              ry={11}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={4}
              opacity={0.55}
              filter="url(#tour-spotlight-glow)"
            >
              <animate
                attributeName="opacity"
                values="0.35;0.85;0.35"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </rect>
            {/* Crisp inner border for maximum contrast */}
            <rect
              x={cutout.left}
              y={cutout.top}
              width={cutout.width}
              height={cutout.height}
              rx={8}
              ry={8}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              opacity={1}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-tooltip-title"
        aria-describedby="tour-tooltip-desc"
        className={cn(
          "fixed rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl",
          "transition-opacity duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{
          top: Math.round(tipTop),
          left: Math.round(tipLeft),
          width: tipW,
          maxHeight: Math.min(tipH, vh - 2 * VIEWPORT_INSET),
          zIndex: 9995,
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              {step.section}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            aria-label="Exit tour"
            onClick={exit}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2">
          <h3
            id="tour-tooltip-title"
            className="text-base font-semibold text-foreground leading-snug"
          >
            {phase === "centered" && step.centeredFallbackTitle
              ? step.centeredFallbackTitle
              : step.title}
          </h3>
          <p id="tour-tooltip-desc" className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {phase === "centered" && step.centeredFallbackDescription
              ? step.centeredFallbackDescription
              : step.description}
          </p>
          {step.isFinal && step.bullets && step.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {step.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 pt-1 pb-3">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === stepIndex
                  ? "w-5 bg-primary"
                  : i < stepIndex
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted-foreground/25",
              )}
            />
          ))}
        </div>

        {/* Footer actions */}
        {step.isFinal ? (
          <div className="px-5 pb-5 pt-1 flex flex-col gap-2">
            <Button size="lg" className="w-full font-semibold shadow-md" onClick={exit}>
              Create your workspace
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="w-full text-muted-foreground" onClick={restart}>
              Restart tour
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={exit}
              className="text-xs text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button size="sm" variant="ghost" onClick={goPrev} className="gap-1 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={goNext} className="gap-1 text-xs">
                {isLast ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(overlay, document.body);
};

export default TourEngine;