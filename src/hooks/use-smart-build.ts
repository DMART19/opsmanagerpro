import { useCallback, useMemo, useRef, useState } from "react";
import {
  BuildMode,
  PlacementResult,
  RuleSet,
  SmartObject,
  World,
} from "@/lib/smart-build/types";
import { IntentTracker } from "@/lib/smart-build/intent";
import { resolvePlacement } from "@/lib/smart-build/engine";

/**
 * Shared React hook that wraps the Smart Build Engine for use inside
 * both `PalletCanvas3D` and `TrailerCanvas3D`.
 */
export function useSmartBuild(rules: RuleSet, initialMode: BuildMode = "smart") {
  const [mode, setMode] = useState<BuildMode>(initialMode);
  const [preview, setPreview] = useState<PlacementResult | null>(null);
  const trackerRef = useRef<IntentTracker>(new IntentTracker());

  const resolve = useCallback(
    (obj: SmartObject, deckX: number, deckY: number, world: World, ignoreId?: string) => {
      const cursor = trackerRef.current.push(deckX, deckY);
      const result = resolvePlacement(obj, cursor, world, rules, { mode, ignoreId });
      setPreview(result);
      return result;
    },
    [mode, rules],
  );

  const clear = useCallback(() => {
    setPreview(null);
    trackerRef.current.reset();
  }, []);

  return useMemo(
    () => ({ mode, setMode, preview, resolve, clear }),
    [mode, preview, resolve, clear],
  );
}
