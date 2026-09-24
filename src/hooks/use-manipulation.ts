import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TransformMode } from "@/lib/manipulation/types";

export interface UseManipulationOptions {
  /** Element that owns keyboard + wheel focus (the canvas wrapper). */
  targetRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  /** Primary selected id owned by the host page (two-way synced). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete?: (ids: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFocus?: (id: string) => void;
  /** Home key — reset the camera to the default view. */
  onResetCamera?: () => void;
  /** Shift + wheel — move the selection up/down by `delta` inches. */
  onVerticalNudge?: (ids: string[], delta: number) => void;
}

/**
 * Shared interaction state + keybindings for BOTH 3D builders.
 * Implements the single canonical control map (see `MANIPULATION_KEYMAP`).
 */
export function useManipulation({
  targetRef,
  enabled = true,
  selectedId,
  onSelect,
  onDelete,
  onUndo,
  onRedo,
  onFocus,
  onResetCamera,
  onVerticalNudge,
}: UseManipulationOptions) {
  const [mode, setMode] = useState<TransformMode>("move");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [snapping, setSnapping] = useState(true);
  const [extraIds, setExtraIds] = useState<string[]>([]);

  const selectedIds = useMemo(
    () => (selectedId ? [selectedId, ...extraIds.filter((i) => i !== selectedId)] : extraIds),
    [selectedId, extraIds],
  );

  /** Left click = select, Shift + click = multi-select. */
  const select = useCallback(
    (id: string | null, additive = false) => {
      if (!id) {
        setExtraIds([]);
        onSelect(null);
        return;
      }
      if (additive) {
        if (!selectedId) {
          onSelect(id);
          return;
        }
        if (id === selectedId) return;
        setExtraIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
        return;
      }
      setExtraIds([]);
      onSelect(id);
    },
    [onSelect, selectedId],
  );

  const clearSelection = useCallback(() => select(null), [select]);

  // Keep refs fresh so the listeners can stay mounted with [] deps.
  const state = useRef({ selectedIds, mode, onDelete, onUndo, onRedo, onFocus, onResetCamera, onVerticalNudge, select, enabled });
  state.current = { selectedIds, mode, onDelete, onUndo, onRedo, onFocus, onResetCamera, onVerticalNudge, select, enabled };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = state.current;
      if (!s.enabled) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.onRedo?.();
        else s.onUndo?.();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (key) {
        case "w": setMode("move"); break;
        case "e": setMode("rotate"); break;
        case "r": setMode("vertical"); break;
        case "f":
          if (s.selectedIds[0]) s.onFocus?.(s.selectedIds[0]);
          break;
        case "home":
          e.preventDefault();
          s.onResetCamera?.();
          break;
        case "delete":
        case "backspace":
          if (s.selectedIds.length) {
            e.preventDefault();
            s.onDelete?.(s.selectedIds);
          }
          break;
        case "escape":
          s.select(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Shift + wheel raises / lowers the selection. Native + non-passive so the
  // page never scrolls behind the canvas.
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const s = state.current;
      if (!s.enabled || !e.shiftKey || !s.selectedIds.length) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const delta = -Math.sign(dy) * Math.min(6, Math.max(1, Math.abs(dy) / 40));
      s.onVerticalNudge?.(s.selectedIds, delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [targetRef]);

  return {
    mode,
    setMode,
    hoveredId,
    setHoveredId,
    snapping,
    setSnapping,
    selectedIds,
    select,
    clearSelection,
  };
}
