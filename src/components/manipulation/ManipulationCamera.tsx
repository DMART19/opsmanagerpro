import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface FocusRequest {
  center: { x: number; y: number; z: number };
  radius: number;
  /** Bump to re-trigger the same focus. */
  nonce: number;
}

/**
 * Shared camera rig for both 3D builders.
 *
 * Right mouse = orbit, middle mouse = pan, wheel = zoom. The left button is
 * deliberately freed up so left-drag belongs to object manipulation.
 */
export default function ManipulationCamera({
  controlsRef,
  target,
  minDistance,
  maxDistance,
  autoRotate = false,
  enabled = true,
  focus,
  interiorBounds,
  onInteriorChange,
}: {
  controlsRef: React.MutableRefObject<any>;
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  autoRotate?: boolean;
  enabled?: boolean;
  focus?: FocusRequest | null;
  /** Box (three.js space, inches) that counts as "inside" — walls fade when entered. */
  interiorBounds?: { width: number; length: number; height: number };
  onInteriorChange?: (inside: boolean) => void;
}) {
  const { camera } = useThree();
  const anim = useRef<{ target: THREE.Vector3; pos: THREE.Vector3; t: number } | null>(null);
  const lastNonce = useRef<number>(-1);
  const wasInside = useRef(false);

  // Right = orbit, middle = pan, left = free for manipulation.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.update?.();
  }, [controlsRef, enabled]);

  // Smooth automatic focus on the selected object.
  useEffect(() => {
    if (!focus || focus.nonce === lastNonce.current) return;
    lastNonce.current = focus.nonce;
    const c = controlsRef.current;
    if (!c) return;
    const center = new THREE.Vector3(focus.center.x, focus.center.y, focus.center.z);
    const dist = Math.max(focus.radius * 4.5, 26);
    const dir = camera.position.clone().sub(c.target).normalize();
    if (dir.lengthSq() < 1e-6) dir.set(0.7, 0.6, 0.7).normalize();
    anim.current = {
      target: center,
      pos: center.clone().add(dir.multiplyScalar(dist)),
      t: 0,
    };
  }, [focus, camera, controlsRef]);

  useFrame((_, dt) => {
    const a = anim.current;
    const c = controlsRef.current;
    if (a && c) {
      const k = Math.min(1, dt * 7);
      c.target.lerp(a.target, k);
      camera.position.lerp(a.pos, k);
      c.update();
      a.t += dt;
      if (a.t > 1.1 || camera.position.distanceTo(a.pos) < 0.4) anim.current = null;
    }

    // Interior detection — fade the shell when the camera is inside the box.
    if (interiorBounds && onInteriorChange) {
      const b = interiorBounds;
      const p = camera.position;
      const pad = 4;
      const inside =
        Math.abs(p.x) < b.width / 2 + pad &&
        Math.abs(p.z) < b.length / 2 + pad &&
        p.y > -pad &&
        p.y < b.height + pad;
      if (inside !== wasInside.current) {
        wasInside.current = inside;
        onInteriorChange(inside);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      zoomSpeed={0.9}
      rotateSpeed={0.8}
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      enabled={enabled}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      minDistance={minDistance}
      maxDistance={maxDistance}
      target={target}
    />
  );
}
