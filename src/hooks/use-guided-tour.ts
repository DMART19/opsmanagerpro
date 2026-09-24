/**
 * useGuidedTour — Sequential tooltip tour for first-time users
 * 
 * Manages step progression, skip, and localStorage persistence.
 * Shows once per unique tour key. Non-blocking, dismissible.
 */

import { useState, useCallback, useEffect } from "react";

const TOUR_PREFIX = "omp_tour_done_";

export interface TourStep {
  /** CSS selector or data-tour attribute value to anchor to */
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  /** Optional route to navigate to before showing this step */
  route?: string;
}

export interface UseGuidedTourOptions {
  /** When true, do not read/write localStorage — tour state lives only in memory. */
  skipPersistence?: boolean;
  /** Force-start the tour even when persisted as done. */
  forceStart?: boolean;
}

export function useGuidedTour(
  tourKey: string,
  steps: TourStep[],
  options: UseGuidedTourOptions = {},
) {
  const storageKey = `${TOUR_PREFIX}${tourKey}`;
  const { skipPersistence = false, forceStart = false } = options;

  const [active, setActive] = useState(() => {
    if (skipPersistence) return forceStart;
    try {
      return forceStart || !localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  const [currentStep, setCurrentStep] = useState(0);

  const finish = useCallback(() => {
    setActive(false);
    if (skipPersistence) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
  }, [storageKey, skipPersistence]);

  const next = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      finish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, finish]);

  const prev = useCallback(() => {
    setCurrentStep(p => Math.max(0, p - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setActive(true);
    if (skipPersistence) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey, skipPersistence]);

  return {
    active,
    currentStep,
    step: active ? steps[currentStep] : null,
    totalSteps: steps.length,
    next,
    prev,
    skip,
    restart,
    isLastStep: currentStep >= steps.length - 1,
    isFirstStep: currentStep === 0,
  };
}
