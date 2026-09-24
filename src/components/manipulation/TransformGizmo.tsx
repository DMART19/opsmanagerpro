import { useEffect, useRef, useState } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import type { TransformMode } from "@/lib/manipulation/types";

export interface GizmoTransform {
  /** World-space centre of the object. */
  x: number;
  y: number;
  z: number;
  /** Euler degrees. */
  rotX: number;
  rotY: number;
  rotZ: number;
}

/**
 * Professional 3-axis transform gizmo (Roblox Studio / Unity style) shared by
 * the Pallet Builder and the Trailer Builder.
 *
 *   move     → X/Z translation arrows
 *   vertical → Y translation arrow only
 *   rotate   → 3-ring rotation handles
 */
export default function TransformGizmo({
  mode,
  transform,
  size = 1,
  translationSnap,
  rotationSnapDeg = 15,
  onChange,
  onDragStart,
  onDragEnd,
}: {
  mode: TransformMode;
  transform: GizmoTransform;
  size?: number;
  translationSnap?: number;
  rotationSnapDeg?: number;
  onChange: (next: GizmoTransform) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [proxy, setProxy] = useState<THREE.Group | null>(null);
  const dragging = useRef(false);

  // Sync the proxy from state whenever the user isn't dragging it.
  useEffect(() => {
    if (!proxy || dragging.current) return;
    proxy.position.set(transform.x, transform.y, transform.z);
    proxy.rotation.set(
      THREE.MathUtils.degToRad(transform.rotX),
      THREE.MathUtils.degToRad(transform.rotY),
      THREE.MathUtils.degToRad(transform.rotZ),
    );
  }, [proxy, transform.x, transform.y, transform.z, transform.rotX, transform.rotY, transform.rotZ]);

  const read = () => {
    if (!proxy) return;
    onChange({
      x: proxy.position.x,
      y: proxy.position.y,
      z: proxy.position.z,
      rotX: THREE.MathUtils.radToDeg(proxy.rotation.x),
      rotY: THREE.MathUtils.radToDeg(proxy.rotation.y),
      rotZ: THREE.MathUtils.radToDeg(proxy.rotation.z),
    });
  };

  return (
    <>
      <group ref={setProxy as unknown as React.Ref<THREE.Group>} />
      {proxy && (
        <TransformControls
          object={proxy}
          mode={mode === "rotate" ? "rotate" : "translate"}
          size={size}
          showX={mode !== "vertical"}
          showZ={mode !== "vertical"}
          showY={mode !== "move"}
          translationSnap={mode === "rotate" ? undefined : translationSnap}
          rotationSnap={rotationSnapDeg > 0 ? THREE.MathUtils.degToRad(rotationSnapDeg) : undefined}
          onMouseDown={() => {
            dragging.current = true;
            onDragStart?.();
          }}
          onMouseUp={() => {
            read();
            dragging.current = false;
            onDragEnd?.();
          }}
          onObjectChange={() => {
            if (dragging.current) read();
          }}
        />
      )}
    </>
  );
}
