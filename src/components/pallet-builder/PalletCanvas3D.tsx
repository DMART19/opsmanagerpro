import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  Html,
  RoundedBox,
  Outlines,
  Edges,
  PerspectiveCamera,
  Line,
} from "@react-three/drei";
import * as THREE from "three";

/** Studio palette for the 3D scene (three.js needs literal colors, not CSS vars).
 *  Mirrors the --viewport / --viewport-elevated design tokens. */
const STUDIO_BG = "#171b21";
const STUDIO_FLOOR = "#1b2027";

import {
  computeBaseYMap,
  baseYFor,
  footprintOf,
  settleAll,
  settleLayer,
  validatePlacement,
  withinPallet,
} from "@/lib/pallet-gravity";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RotateCcw,
  Camera as CameraIcon,
  Maximize2,
  Layers as LayersIcon,
  Eye,
  Flame,
  Ruler,
  Target,
  Sparkles,
  Box as BoxIcon,
  RefreshCw,
  Trash2,
  RotateCw,
  Plus,
  PanelRightOpen,
  PanelRightClose,
  Search,
  Move3D,
  Magnet,
} from "lucide-react";
import type { PlacedCase, PalletLibraryItem } from "@/types/pallet-builder";
import type { PalletConfig } from "@/pages/PalletBuilder";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  eulerRad,
  getEulerDeg,
  getRotatedAABB,
  hasFreeRotation,
  toDegrees,
} from "@/lib/pallet-rotation";
import {
  ManipulationCamera,
  TransformGizmo,
  ControlsLegend,
  ModeToolbar,
  type FocusRequest,
} from "@/components/manipulation";
import { useManipulation } from "@/hooks/use-manipulation";
import { HistoryStack } from "@/lib/manipulation/history";
import type { TransformMode } from "@/lib/manipulation/types";

/**
 * 3D pallet visualization.
 *
 * READ-ONLY render of the existing pallet build. No business logic, no
 * collision detection, no validation engine, no auto-build math — it consumes
 * the same {@link PlacedCase}[] and {@link PalletConfig} the 2D canvas does
 * and renders them in a professional warehouse-style 3D scene.
 *
 * Selection is two-way synced with the parent via {@link onSelectCase}.
 */
export interface PalletCanvas3DProps {
  selectedPallet: PalletConfig;
  placedCases: PlacedCase[];
  selectedCaseId: string | null;
  onSelectCase: (id: string | null) => void;
  /** Optional — enables interactivity (drag/move, rotate, delete, add) */
  onUpdateCases?: (cases: PlacedCase[]) => void;
  selectedLayer?: number;
  libraryItems?: PalletLibraryItem[];
  /** Called when the user exits fullscreen — parent should drop back to 2D. */
  onExitFullscreen?: () => void;
  /**
   * Called when the user drags or clicks a library item that is missing
   * width/length/height/weight. Parent should open a dimension-capture flow
   * and place the item once dimensions are captured.
   */
  onRequestDimensions?: (item: PalletLibraryItem) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Category palette
// ──────────────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  food: "#3b82f6",
  medical: "#10b981",
  electronics: "#f97316",
  hazmat: "#ef4444",
  mixed: "#9ca3af",
  general: "#a3a3a3",
};
const FALLBACK_PALETTE = ["#6366f1", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b", "#ec4899", "#8b5cf6"];
function colorForCategory(category?: string, fallbackKey?: string): string {
  if (category) {
    const key = category.toLowerCase();
    for (const k of Object.keys(CATEGORY_COLORS)) {
      if (key.includes(k)) return CATEGORY_COLORS[k];
    }
  }
  // Stable hash fallback so unknown categories still get a consistent color
  const seed = fallbackKey || category || "x";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
}

function heatmapColor(weight: number, max: number): string {
  const t = Math.max(0, Math.min(1, weight / Math.max(1, max)));
  // green -> yellow -> red
  if (t < 0.5) {
    const p = t / 0.5;
    const r = Math.round(34 + (250 - 34) * p);
    const g = Math.round(197 + (204 - 197) * p);
    const b = Math.round(94 + (21 - 94) * p);
    return `rgb(${r},${g},${b})`;
  }
  const p = (t - 0.5) / 0.5;
  const r = Math.round(250 + (239 - 250) * p);
  const g = Math.round(204 + (68 - 204) * p);
  const b = Math.round(21 + (68 - 21) * p);
  return `rgb(${r},${g},${b})`;
}

// Per-case base Y comes from the gravity engine: a box always rests on the
// deck or on the real boxes directly beneath it — never in mid-air.

// ──────────────────────────────────────────────────────────────────────────────
// Pallet deck
// ──────────────────────────────────────────────────────────────────────────────
const WOOD_COLOR = "#c9a06b";
const WOOD_DARK = "#9a7448";

function PalletDeck({
  width,
  length,
  height,
  active,
  onSpinStart,
}: {
  width: number;
  length: number;
  height: number;
  active?: boolean;
  onSpinStart?: (e: any) => void;
}) {
  // Standard GMA pallet: 7 top deck boards + 3 stringers + 3 bottom boards.
  // Approximate with a simple slab plus rounded edges for performance.
  const blockH = height * 0.55;
  const topBoardH = height * 0.18;
  const stringerH = height - blockH - topBoardH;
  const blockW = Math.min(width, length) * 0.16;

  return (
    <group
      position={[0, 0, 0]}
      onPointerDown={(e) => onSpinStart?.(e)}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (onSpinStart) document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (onSpinStart) document.body.style.cursor = "";
      }}
    >
      {/* Top deck */}
      <RoundedBox
        args={[width, topBoardH, length]}
        radius={0.4}
        smoothness={2}
        position={[0, height - topBoardH / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.85} metalness={0.05} />
        {active && <Edges color="#38bdf8" />}
      </RoundedBox>
      {/* Stringers */}
      <RoundedBox
        args={[width * 0.96, stringerH, length * 0.96]}
        radius={0.3}
        smoothness={2}
        position={[0, blockH + stringerH / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </RoundedBox>
      {/* Nine blocks */}
      {[-1, 0, 1].map((ix) =>
        [-1, 0, 1].map((iz) => (
          <RoundedBox
            key={`block-${ix}-${iz}`}
            args={[blockW, blockH, blockW]}
            radius={0.25}
            smoothness={2}
            position={[(width / 2 - blockW / 2) * ix, blockH / 2, (length / 2 - blockW / 2) * iz]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </RoundedBox>
        ))
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Carton
// ──────────────────────────────────────────────────────────────────────────────
interface CartonProps {
  c: PlacedCase;
  baseY: number;
  palletWidth: number;
  palletLength: number;
  isSelected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  visible: boolean;
  opacity: number;
  color: string;
  yOffset: number; // for exploded view
  showLabels: boolean;
  hoverInfo: (info: { id: string; screenX: number; screenY: number } | null) => void;
  isDragging?: boolean;
  dragValid?: boolean;
  dragOverrideX?: number;
  dragOverrideY?: number;
  onDragStart?: (id: string) => void;
}

function Carton({
  c,
  baseY,
  palletWidth,
  palletLength,
  isSelected,
  hovered,
  onHover,
  onSelect,
  visible,
  opacity,
  color,
  yOffset,
  showLabels,
  isDragging,
  dragValid,
  dragOverrideX,
  dragOverrideY,
  onDragStart,
}: CartonProps) {
  // Rotated axis-aligned footprint (handles legacy 90° yaw and free rotation).
  const aabb = getRotatedAABB(c);
  const w = aabb.w;
  const l = aabb.l;
  const isFree = hasFreeRotation(c);
  const rot = eulerRad(c);

  // Center coordinates: pallet origin is centered at (0,0,0); placed coords
  // are top-left in pallet inches, so shift by half-pallet then half-footprint.
  const effX = isDragging && dragOverrideX !== undefined ? dragOverrideX : c.x;
  const effY = isDragging && dragOverrideY !== undefined ? dragOverrideY : c.y;
  const cx = -palletWidth / 2 + effX + w / 2;
  const cz = -palletLength / 2 + effY + l / 2;
  // For free rotation, offset the group so the rotated bottom rests on baseY.
  const centerY = isFree ? baseY - aabb.minDy : baseY + c.height / 2;
  const cy = centerY + (hovered || isSelected || isDragging ? 0.25 : 0) + yOffset + (isDragging ? 1.5 : 0);

  // Animate hover/select lift smoothly
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    // Smooth lerp on all three axes for fluid drag/hover transitions.
    const k = Math.min(1, dt * (isDragging ? 18 : 14));
    const p = groupRef.current.position;
    p.x += (cx - p.x) * k;
    p.y += (cy - p.y) * k;
    p.z += (cz - p.z) * k;
  });

  if (!visible) return null;

  const dragColor = isDragging ? (dragValid ? "#22c55e" : "#ef4444") : color;

  return (
    <group ref={groupRef} position={[cx, cy, cz]}>
      <RoundedBox
        args={[c.width, c.height, c.length]}
        rotation={rot as unknown as [number, number, number]}
        radius={0.25}
        smoothness={2}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(c.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(c.id);
        }}
        onPointerDown={(e) => {
          if (!onDragStart) return;
          // Only handle primary button (left click / single touch)
          if ((e as any).button !== undefined && (e as any).button !== 0) return;
          e.stopPropagation();
          onSelect(c.id);
          onDragStart(c.id);
        }}
      >
        <meshStandardMaterial
          color={dragColor}
          roughness={0.7}
          metalness={0.05}
          transparent={opacity < 1 || isDragging}
          opacity={isDragging ? 0.85 : opacity}
          emissive={isDragging ? dragColor : isSelected ? color : hovered ? color : "#000"}
          emissiveIntensity={isDragging ? 0.45 : isSelected ? 0.35 : hovered ? 0.18 : 0}
        />
        {(isSelected || hovered || isDragging) && (
          <Outlines
            thickness={isDragging ? 3 : isSelected ? 2.5 : 1.5}
            color={isDragging ? dragColor : isSelected ? "#0ea5e9" : "#ffffff"}
          />
        )}
      </RoundedBox>

      {/* Top label */}
      {showLabels && (
        <Html
          position={[0, aabb.maxDy + 0.05, 0]}
          center
          distanceFactor={32}
          occlude={false}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className="px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/40 shadow-sm text-[10px] leading-tight font-medium text-foreground/90 whitespace-nowrap">
            <div className="truncate max-w-[80px]">{c.caseId}</div>
            <div className="text-[8px] text-muted-foreground tabular-nums">{c.weight}lb</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Center of gravity marker
// ──────────────────────────────────────────────────────────────────────────────
function CenterOfGravity({
  cases,
  palletWidth,
  palletLength,
  deckHeight,
}: {
  cases: PlacedCase[];
  palletWidth: number;
  palletLength: number;
  deckHeight: number;
}) {
  const cog = useMemo(() => {
    if (cases.length === 0) return null;
    let totalW = 0;
    let sx = 0;
    let sz = 0;
    let sy = 0;
    for (const c of cases) {
      const rotated = c.rotation === 90 || c.rotation === 270;
      const w = rotated ? c.length : c.width;
      const l = rotated ? c.width : c.length;
      const cx = -palletWidth / 2 + c.x + w / 2;
      const cz = -palletLength / 2 + c.y + l / 2;
      const cy = deckHeight + (c.z - 1) * c.height + c.height / 2;
      sx += cx * c.weight;
      sz += cz * c.weight;
      sy += cy * c.weight;
      totalW += c.weight;
    }
    if (totalW === 0) return null;
    const x = sx / totalW;
    const y = sy / totalW;
    const z = sz / totalW;
    // Risk: offset from pallet center / half-extent
    const offset = Math.hypot(x / (palletWidth / 2), z / (palletLength / 2));
    const color = offset < 0.2 ? "#22c55e" : offset < 0.45 ? "#facc15" : "#ef4444";
    return { x, y, z, color };
  }, [cases, palletWidth, palletLength, deckHeight]);

  if (!cog) return null;

  return (
    <group>
      <mesh position={[cog.x, cog.y, cog.z]}>
        <sphereGeometry args={[1.2, 24, 24]} />
        <meshStandardMaterial color={cog.color} emissive={cog.color} emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      <Line
        points={[
          [cog.x, deckHeight, cog.z],
          [cog.x, cog.y, cog.z],
        ]}
        color={cog.color}
        lineWidth={2}
        dashed={false}
      />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Measurements bbox + dimension labels
// ──────────────────────────────────────────────────────────────────────────────
function Measurements({
  width,
  length,
  totalHeight,
}: {
  width: number;
  length: number;
  totalHeight: number;
}) {
  return (
    <group>
      <mesh position={[0, totalHeight / 2, 0]}>
        <boxGeometry args={[width, totalHeight, length]} />
        <meshBasicMaterial visible={false} />
        <Edges color="#0ea5e9" threshold={1} />
      </mesh>
      <Html position={[0, totalHeight + 2, length / 2 + 2]} center distanceFactor={32} style={{ pointerEvents: "none" }}>
        <div className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold whitespace-nowrap">
          {width.toFixed(0)}" × {length.toFixed(0)}" × {totalHeight.toFixed(0)}"
        </div>
      </Html>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Camera rig with view presets
// ──────────────────────────────────────────────────────────────────────────────
type ViewPreset = "iso" | "top" | "front" | "side" | "reset";
interface CameraController {
  setView: (v: ViewPreset) => void;
  screenshot: () => void;
  toggleAutoRotate: () => void;
  autoRotate: boolean;
}

function CameraRig({
  controllerRef,
  width,
  length,
  totalHeight,
  autoRotate,
  controlsRef,
}: {
  controllerRef: React.MutableRefObject<CameraController | null>;
  width: number;
  length: number;
  totalHeight: number;
  autoRotate: boolean;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera, gl } = useThree();
  const radius = Math.max(width, length, totalHeight) * 1.5 + 30;

  const setView = useCallback(
    (v: ViewPreset) => {
      const controls = controlsRef.current;
      if (!controls) return;
      switch (v) {
        case "top":
          camera.position.set(0, radius * 1.2, 0.01);
          break;
        case "front":
          camera.position.set(0, totalHeight / 2 + 5, radius);
          break;
        case "side":
          camera.position.set(radius, totalHeight / 2 + 5, 0);
          break;
        case "iso":
        case "reset":
        default:
          camera.position.set(radius * 0.8, radius * 0.7, radius * 0.8);
      }
      controls.target.set(0, totalHeight / 2, 0);
      controls.update();
    },
    [camera, controlsRef, radius, totalHeight]
  );

  useEffect(() => {
    controllerRef.current = {
      setView,
      screenshot: () => {
        try {
          const data = gl.domElement.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = data;
          link.download = `pallet-3d-${Date.now()}.png`;
          link.click();
        } catch (e) {
          console.error(e);
        }
      },
      toggleAutoRotate: () => {
        if (controlsRef.current) controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      },
      autoRotate,
    };
  }, [setView, gl, controllerRef, autoRotate, controlsRef]);

  // Set initial view once
  useEffect(() => {
    setView("iso");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Captures the active Three.js camera so the wrapper can perform raycasts
// for HTML5 drag-and-drop drops from the library panel.
function CameraCapture({ cameraRef }: { cameraRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Scene
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Scene body
// ──────────────────────────────────────────────────────────────────────────────
interface SceneProps {
  pallet: PalletConfig;
  cases: PlacedCase[];
  selectedCaseId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  layerLimit: number; // 0 = all
  xray: boolean;
  heatmap: boolean;
  showCOG: boolean;
  showMeasurements: boolean;
  exploded: boolean;
  controllerRef: React.MutableRefObject<CameraController | null>;
  autoRotate: boolean;
  controlsRef: React.MutableRefObject<any>;
  dragId: string | null;
  dragPos: { x: number; y: number; z: number; baseY: number } | null;
  dragValid: boolean;
  /** Translucent preview of an incoming library item (green = valid, red = blocked). */
  ghost?: {
    x: number;
    y: number;
    baseY: number;
    w: number;
    l: number;
    h: number;
    valid: boolean;
  } | null;
  onDragStart?: (id: string) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  rotationSnapDeg: number;
  onFreeRotate?: (id: string, euler: { x: number; y: number; z: number }) => void;
  /** Shared manipulation state (identical in the Trailer Builder). */
  mode: TransformMode;
  snapping: boolean;
  focus?: FocusRequest | null;
  onGizmoDragStart?: (id: string) => void;
  onGizmoDragEnd?: () => void;
  onGizmoTransform?: (
    id: string,
    t: { deckX: number; deckY: number; worldY: number; euler: { x: number; y: number; z: number } },
  ) => void;
}

function Scene({
  pallet,
  cases,
  selectedCaseId,
  hoveredId,
  onHover,
  onSelect,
  layerLimit,
  xray,
  heatmap,
  showCOG,
  showMeasurements,
  exploded,
  controllerRef,
  autoRotate,
  controlsRef,
  dragId,
  dragPos,
  dragValid,
  ghost,
  onDragStart,
  onDragMove,
  onDragEnd,
  rotationSnapDeg,
  onFreeRotate,
  mode,
  snapping,
  focus,
  onGizmoDragStart,
  onGizmoDragEnd,
  onGizmoTransform,
}: SceneProps) {
  const deckHeight = 5; // inches
  const baseYs = useMemo(() => computeBaseYMap(cases, deckHeight), [cases]);
  const maxLayer = useMemo(
    () => cases.reduce((m, c) => Math.max(m, c.z), 0),
    [cases]
  );
  const totalHeight = useMemo(() => {
    if (cases.length === 0) return deckHeight + 10;
    let top = deckHeight;
    for (const c of cases) {
      const base = baseYs.get(c.id) ?? deckHeight;
      top = Math.max(top, base + c.height);
    }
    return top;
  }, [cases, baseYs]);
  const maxWeight = useMemo(() => cases.reduce((m, c) => Math.max(m, c.weight), 0), [cases]);

  // Hide labels when zoomed out (frame-time check by camera distance)
  const { camera } = useThree();
  const [labelsOn, setLabelsOn] = useState(true);
  useFrame(() => {
    const dist = camera.position.length();
    const should = dist < Math.max(pallet.width, pallet.length) * 1.4;
    if (should !== labelsOn) setLabelsOn(should);
  });

  // ── Turntable: click the pallet itself and drag to spin the whole build ──
  const [spinning, setSpinning] = useState(false);
  const spinRef = useRef<{ x: number; y: number; az: number; pol: number } | null>(null);

  const beginSpin = (e: any) => {
    const controls = controlsRef.current;
    if (!controls || dragId) return;
    e.stopPropagation?.();
    const ne = e.nativeEvent ?? e;
    spinRef.current = {
      x: ne.clientX ?? 0,
      y: ne.clientY ?? 0,
      az: controls.getAzimuthalAngle(),
      pol: controls.getPolarAngle(),
    };
    setSpinning(true);
  };

  useEffect(() => {
    if (!spinning) return;
    const onMove = (ev: PointerEvent) => {
      const s = spinRef.current;
      const controls = controlsRef.current;
      if (!s || !controls) return;
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;
      controls.setAzimuthalAngle(s.az - dx * 0.008);
      controls.setPolarAngle(
        Math.max(0.05, Math.min(Math.PI - 0.05, s.pol - dy * 0.005)),
      );
      controls.update();
    };
    const onUp = () => {
      spinRef.current = null;
      setSpinning(false);
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "grabbing";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [spinning, controlsRef]);

  return (
    <>
      {/* Dark charcoal studio — keeps the pallet the brightest thing on screen */}
      <color attach="background" args={[STUDIO_BG]} />
      <fog attach="fog" args={[STUDIO_BG, 220, 900]} />

      {/* Key / fill / rim three-point lighting */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#cfe0f5", "#0d1116", 0.55]} />
      <directionalLight
        position={[70, 120, 50]}
        intensity={1.35}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
      />
      {/* Cool fill from the opposite side */}
      <directionalLight position={[-60, 55, -40]} intensity={0.4} color="#8fb6e8" />
      {/* Warm rim for edge separation against the dark floor */}
      <directionalLight position={[-20, 30, 90]} intensity={0.28} color="#ffd9b0" />

      <Suspense fallback={null}>
        {/* Environment removed: HDR fetch fails in sandbox */}
      </Suspense>

      {/* Floor — slightly reflective dark slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={STUDIO_FLOOR} roughness={0.62} metalness={0.22} />
      </mesh>
      {/* Subtle measurement grid, fades out with distance */}
      <Grid
        position={[0, 0.005, 0]}
        args={[600, 600]}
        cellSize={6}
        cellThickness={0.5}
        cellColor="#2b333d"
        sectionSize={48}
        sectionThickness={1}
        sectionColor="#3d4a58"
        fadeDistance={520}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
      />
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.7}
        scale={Math.max(pallet.width, pallet.length) * 3}
        blur={2.8}
        far={totalHeight + 20}
        color="#000000"
      />

      {/* Pallet deck */}
      <PalletDeck
        width={pallet.width}
        length={pallet.length}
        height={deckHeight}
        active={spinning}
        onSpinStart={beginSpin}
      />

      {/* Cartons */}
      {cases.map((c) => {
        const dragging = dragId === c.id;
        const base = dragging && dragPos ? dragPos.baseY : baseYs.get(c.id) ?? deckHeight;
        const aboveLimit = layerLimit > 0 && c.z > layerLimit;
        const visible = !aboveLimit || xray; // X-Ray keeps upper layers visible at low opacity
        const opacity = aboveLimit ? 0.35 : xray && c.z < maxLayer ? 0.55 : 1;
        const color = heatmap ? heatmapColor(c.weight, maxWeight) : colorForCategory(c.category, c.caseType);
        const yOffset = exploded ? (c.z - 1) * 8 : 0;
        return (
          <Carton
            key={c.id}
            c={c}
            baseY={base}
            palletWidth={pallet.width}
            palletLength={pallet.length}
            isSelected={selectedCaseId === c.id}
            hovered={hoveredId === c.id}
            onHover={onHover}
            onSelect={onSelect}
            visible={visible}
            opacity={opacity}
            color={color}
            yOffset={yOffset}
            showLabels={labelsOn && !aboveLimit}
            hoverInfo={() => {}}
            isDragging={dragging}
            dragValid={dragValid}
            dragOverrideX={dragging && dragPos ? dragPos.x : undefined}
            dragOverrideY={dragging && dragPos ? dragPos.y : undefined}
            onDragStart={onDragStart}
          />
        );
      })}

      {/* Drag plane — invisible XZ plane that captures pointer moves while
          a carton is being repositioned. Lives at the dragged carton's base
          height so screen-to-world mapping is intuitive. */}
      {dragId && (() => {
        const c = cases.find((x) => x.id === dragId);
        if (!c) return null;
        const base = dragPos ? dragPos.baseY : baseYs.get(c.id) ?? deckHeight;
        return (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, base + 0.05, 0]}
            onPointerMove={(e) => {
              e.stopPropagation();
              const rotated = c.rotation === 90 || c.rotation === 270;
              const w = rotated ? c.length : c.width;
              const l = rotated ? c.width : c.length;
              // e.point is world-space; convert back to pallet-top-left coords
              const px = Math.round(e.point.x + pallet.width / 2 - w / 2);
              const py = Math.round(e.point.z + pallet.length / 2 - l / 2);
              onDragMove?.(px, py);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onDragEnd?.();
            }}
            onPointerMissed={() => onDragEnd?.()}
          >
            <planeGeometry args={[5000, 5000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })()}

      {/* Drop ghost — shows exactly where gravity will settle the item. */}
      {ghost && (
        <mesh
          position={[
            -pallet.width / 2 + ghost.x + ghost.w / 2,
            ghost.baseY + ghost.h / 2,
            -pallet.length / 2 + ghost.y + ghost.l / 2,
          ]}
        >
          <boxGeometry args={[ghost.w, ghost.h, ghost.l]} />
          <meshStandardMaterial
            color={ghost.valid ? "#22c55e" : "#ef4444"}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
          <Edges color={ghost.valid ? "#16a34a" : "#dc2626"} />
        </mesh>
      )}

      {showCOG && cases.length > 1 && (
        <CenterOfGravity
          cases={cases}
          palletWidth={pallet.width}
          palletLength={pallet.length}
          deckHeight={deckHeight}
        />
      )}

      {showMeasurements && (
        <Measurements width={pallet.width} length={pallet.length} totalHeight={totalHeight} />
      )}

      {/* Shared 3-axis transform gizmo — identical in the Trailer Builder */}
      {selectedCaseId && onGizmoTransform && (() => {
        const sc = cases.find((c) => c.id === selectedCaseId);
        if (!sc) return null;
        const aabb = getRotatedAABB(sc);
        const live = dragId === sc.id && dragPos ? dragPos : null;
        const base = live ? live.baseY : baseYs.get(sc.id) ?? deckHeight;
        const px = live ? live.x : sc.x;
        const py = live ? live.y : sc.y;
        const e = getEulerDeg(sc);
        return (
          <TransformGizmo
            mode={mode}
            size={Math.max(0.7, Math.min(pallet.width, pallet.length) / 70)}
            translationSnap={snapping ? 1 : undefined}
            rotationSnapDeg={rotationSnapDeg}
            transform={{
              x: -pallet.width / 2 + px + aabb.w / 2,
              y: hasFreeRotation(sc) ? base - aabb.minDy : base + sc.height / 2,
              z: -pallet.length / 2 + py + aabb.l / 2,
              rotX: e.x,
              rotY: e.y,
              rotZ: e.z,
            }}
            onDragStart={() => onGizmoDragStart?.(sc.id)}
            onDragEnd={() => onGizmoDragEnd?.()}
            onChange={(n) =>
              onGizmoTransform(sc.id, {
                deckX: n.x + pallet.width / 2 - aabb.w / 2,
                deckY: n.z + pallet.length / 2 - aabb.l / 2,
                worldY: n.y,
                euler: { x: n.rotX, y: n.rotY, z: n.rotZ },
              })
            }
          />
        );
      })()}

      <ManipulationCamera
        controlsRef={controlsRef}
        target={[0, totalHeight / 2, 0]}
        minDistance={Math.max(pallet.width, pallet.length) * 0.4}
        maxDistance={Math.max(pallet.width, pallet.length) * 6}
        autoRotate={autoRotate && !dragId && !spinning}
        enabled={!dragId && !spinning}
        focus={focus}
      />

      <CameraRig
        controllerRef={controllerRef}
        controlsRef={controlsRef}
        width={pallet.width}
        length={pallet.length}
        totalHeight={totalHeight}
        autoRotate={autoRotate}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main wrapper component
// ──────────────────────────────────────────────────────────────────────────────
export default function PalletCanvas3D({
  selectedPallet,
  placedCases,
  selectedCaseId,
  onSelectCase,
  onUpdateCases,
  selectedLayer = 1,
  libraryItems,
  onExitFullscreen,
  onRequestDimensions,
}: PalletCanvas3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CameraController | null>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  /** Item currently being dragged from the library (HTML5 DnD). */
  const dragLibraryRef = useRef<PalletLibraryItem | null>(null);
  const [externalDragHover, setExternalDragHover] = useState<{
    x: number;
    y: number;
    z: number;
    baseY: number;
    w: number;
    l: number;
    h: number;
  } | null>(null);
  const [externalDragValid, setExternalDragValid] = useState(true);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [layerLimit, setLayerLimit] = useState(0); // 0 = show all
  const [xray, setXray] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [showCOG, setShowCOG] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);
  // Exploded view is opt-in: by default boxes render exactly where they rest,
  // so nothing ever looks like it's hovering above its support.
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // ── Rotation snap (shared gizmo) ────────────────────────────────────────
  const [rotationSnapDeg, setRotationSnapDeg] = useState<number>(0); // 0 = off
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const historyRef = useRef(new HistoryStack<PlacedCase[]>(50));

  // ── Interactivity state ──────────────────────────────────────────────────
  const interactive = !!onUpdateCases;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number; z: number; baseY: number } | null>(null);
  const [dragValid, setDragValid] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-open the inventory library whenever we have items to add — drag &
  // drop directly in 3D should be the default experience, not opt-in.
  useEffect(() => {
    if (interactive && libraryItems && libraryItems.length > 0) setLibraryOpen(true);
  }, [interactive, libraryItems]);

  // Track fullscreen state so the toolbar toggle stays in sync, and notify
  // the parent when the user leaves fullscreen. We deliberately do NOT auto
  // enter fullscreen on mount — doing so hides portaled modals (like the
  // dimension-capture modal) and toasts rendered outside the wrapper, which
  // makes drops of dimensionless items appear to silently fail.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onChange = () => {
      const fs = document.fullscreenElement === el;
      setIsFullscreen(fs);
      if (!fs) onExitFullscreen?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    // Auto-expand into fullscreen the moment the 3D view mounts so users
    // land in the immersive workspace by default. Guarded and best-effort —
    // rejections (permissions, user gesture policy) are swallowed.
    if (typeof document !== "undefined" && document.fullscreenEnabled && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement === el) document.exitFullscreen?.().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-enter fullscreen on the wrapper (best-effort). Used after the
   *  dimension-capture modal closes so the user snaps back into the
   *  expanded 3D workspace. */
  const reenterFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof document === "undefined" || !document.fullscreenEnabled) return;
    if (document.fullscreenElement === el) return;
    el.requestFullscreen?.().catch(() => {});
  }, []);

  // When the parent finishes placing a newly-sized item, placedCases grows.
  // If we exited fullscreen to show the dimension modal, snap back into it.
  const prevPlacedCountRef = useRef(placedCases.length);
  useEffect(() => {
    const prev = prevPlacedCountRef.current;
    prevPlacedCountRef.current = placedCases.length;
    if (placedCases.length > prev) reenterFullscreen();
  }, [placedCases.length, reenterFullscreen]);

  /** Exit fullscreen if the wrapper is the current fullscreen element, so
   *  portaled UI (modals, toasts) becomes visible again. */
  const ensureModalVisible = useCallback(() => {
    if (typeof document !== "undefined" && document.fullscreenElement === wrapperRef.current) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // ── Geometry helpers (collision, boundary, first-fit) ────────────────────
  const checkCollision = useCallback(
    (x: number, y: number, w: number, l: number, excludeId: string, layer: number) => {
      return placedCases.some((c) => {
        if (c.id === excludeId || c.z !== layer) return false;
        const cw = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
        const cl = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
        const ox = Math.min(x + w, c.x + cw) - Math.max(x, c.x);
        const oy = Math.min(y + l, c.y + cl) - Math.max(y, c.y);
        return ox > 0.1 && oy > 0.1;
      });
    },
    [placedCases]
  );

  const inBounds = useCallback(
    (x: number, y: number, w: number, l: number) =>
      x >= 0 && y >= 0 && x + w <= selectedPallet.width && y + l <= selectedPallet.length,
    [selectedPallet]
  );

  /**
   * Commit a case list through the gravity engine: every box is settled onto
   * the deck or fully onto the boxes below it, so nothing can ever float.
   */
  const commitCases = useCallback(
    (next: PlacedCase[]) => {
      historyRef.current.push(placedCases);
      onUpdateCases?.(settleAll(next));
    },
    [onUpdateCases, placedCases]
  );

  /**
   * Safety net: cases arriving from auto-build, 2D editing or import may be
   * floating. Settle them once so the 3D scene can never show a hovering box.
   */
  useEffect(() => {
    if (!onUpdateCases || placedCases.length === 0) return;
    const settled = settleAll(placedCases);
    const changed = settled.some((c, i) => c.z !== placedCases[i].z);
    if (changed) onUpdateCases(settled);
  }, [placedCases, onUpdateCases]);

  /**
   * Gravity resolve for a footprint: snap-free X/Y in, settled layer +
   * bottom-face Y out. Returns null when nothing valid supports it.
   */
  const resolveSupported = useCallback(
    (x: number, y: number, w: number, l: number, excludeId?: string) => {
      const foot = { x, y, w, l };
      if (!withinPallet(foot, selectedPallet.width, selectedPallet.length)) return null;
      const layer = settleLayer(placedCases, foot, excludeId);
      if (layer == null) return null;
      return {
        layer,
        baseY: baseYFor(placedCases, foot, layer, 5, excludeId),
      };
    },
    [placedCases, selectedPallet]
  );

  /** Magnetic X/Y snap: pallet edges + flush alignment with neighbours. */
  const snapXY = useCallback(
    (x: number, y: number, w: number, l: number, excludeId?: string, snap = 2.5) => {
      let nx = x;
      let ny = y;
      if (nx < snap) nx = 0;
      else if (selectedPallet.width - (nx + w) < snap) nx = selectedPallet.width - w;
      if (ny < snap) ny = 0;
      else if (selectedPallet.length - (ny + l) < snap) ny = selectedPallet.length - l;
      for (const c of placedCases) {
        if (c.id === excludeId) continue;
        const { w: cw, l: cl } = footprintOf(c);
        if (Math.abs(nx - (c.x + cw)) < snap) nx = c.x + cw;
        else if (Math.abs(nx + w - c.x) < snap) nx = c.x - w;
        else if (Math.abs(nx - c.x) < snap) nx = c.x;
        if (Math.abs(ny - (c.y + cl)) < snap) ny = c.y + cl;
        else if (Math.abs(ny + l - c.y) < snap) ny = c.y - l;
        else if (Math.abs(ny - c.y) < snap) ny = c.y;
      }
      return {
        x: Math.max(0, Math.min(nx, selectedPallet.width - w)),
        y: Math.max(0, Math.min(ny, selectedPallet.length - l)),
      };
    },
    [placedCases, selectedPallet]
  );

  /**
   * Stack assist: given a point on the deck plane (inches, pallet space), find
   * the top-most placed case under that point and return the best fully
   * supported slot on its top face. Returns null when nothing is under the
   * point or nothing fits up there.
   */
  const stackSlotOver = useCallback(
    (
      px: number,
      py: number,
      w: number,
      l: number,
      excludeId?: string
    ): { x: number; y: number; z: number } | null => {
      const clampX = (v: number) => Math.max(0, Math.min(v, selectedPallet.width - w));
      const clampY = (v: number) => Math.max(0, Math.min(v, selectedPallet.length - l));
      // Top-most case whose footprint contains the point.
      const under = placedCases
        .filter((c) => c.id !== excludeId)
        .filter((c) => {
          const f = footprintOf(c);
          return px >= c.x - 0.5 && px <= c.x + f.w + 0.5 && py >= c.y - 0.5 && py <= c.y + f.l + 0.5;
        })
        .sort((a, b) => b.z - a.z)[0];
      if (!under) return null;
      const f = footprintOf(under);
      const target = under.z + 1;
      // Candidate slots on that surface: cursor-aligned first, then the
      // support box's corners / centre so partial overhangs still stack.
      const cands = [
        { x: px - w / 2, y: py - l / 2 },
        { x: under.x + (f.w - w) / 2, y: under.y + (f.l - l) / 2 },
        { x: under.x, y: under.y },
        { x: under.x + f.w - w, y: under.y },
        { x: under.x, y: under.y + f.l - l },
        { x: under.x + f.w - w, y: under.y + f.l - l },
      ];
      for (const cd of cands) {
        const bx = Math.round(clampX(cd.x));
        const by = Math.round(clampY(cd.y));
        const snapped = snapXY(bx, by, w, l, excludeId);
        for (const pos of [snapped, { x: bx, y: by }]) {
          const layer = settleLayer(placedCases, { x: pos.x, y: pos.y, w, l }, excludeId, target);
          if (layer === target) return { x: pos.x, y: pos.y, z: layer };
        }
      }
      return null;
    },
    [placedCases, selectedPallet, snapXY]
  );

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (id: string) => {
      if (!interactive) return;
      const c = placedCases.find((x) => x.id === id);
      if (!c) return;
      const { w, l } = footprintOf(c);
      const settled = resolveSupported(c.x, c.y, w, l, id);
      setDragId(id);
      setDragPos({
        x: c.x,
        y: c.y,
        z: settled?.layer ?? c.z,
        baseY: settled?.baseY ?? 5,
      });
      setDragValid(true);
    },
    [interactive, placedCases, resolveSupported]
  );

  const handleDragMove = useCallback(
    (rawX: number, rawY: number) => {
      if (!dragId) return;
      const c = placedCases.find((x) => x.id === dragId);
      if (!c) return;
      const { w, l } = footprintOf(c);
      const x = Math.max(0, Math.min(rawX, selectedPallet.width - w));
      const y = Math.max(0, Math.min(rawY, selectedPallet.length - l));
      // Magnetic X/Y snap to walls + neighbour edges, then gravity settle.
      const snapped = snapXY(x, y, w, l, dragId);
      const settled = resolveSupported(snapped.x, snapped.y, w, l, dragId);
      // Stack assist: if the item is being dragged over another box, prefer
      // resting on that box's top face instead of falling to the deck.
      const stack = stackSlotOver(x + w / 2, y + l / 2, w, l, dragId);
      if (stack && (!settled || stack.z > settled.layer)) {
        setDragPos({
          x: stack.x,
          y: stack.y,
          z: stack.z,
          baseY: baseYFor(placedCases, { x: stack.x, y: stack.y, w, l }, stack.z, 5, dragId),
        });
        setDragValid(true);
        return;
      }
      setDragPos({
        x: snapped.x,
        y: snapped.y,
        z: settled?.layer ?? c.z,
        baseY: settled?.baseY ?? 5,
      });
      setDragValid(!!settled);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragId, placedCases, selectedPallet, resolveSupported, stackSlotOver]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragId || !dragPos || !onUpdateCases) {
      setDragId(null);
      setDragPos(null);
      return;
    }
    const c = placedCases.find((x) => x.id === dragId);
    if (c && dragValid) {
      // Commit the settled X/Y/layer — gravity pass guarantees full support.
      commitCases(
        placedCases.map((p) =>
          p.id === dragId ? { ...p, x: dragPos.x, y: dragPos.y, z: dragPos.z } : p
        )
      );
    } else if (!dragValid) {
      // Rejected → the box snaps back to its previous valid position.
      toast.info("Can't place here", {
        description: "Needs solid support underneath and must stay on the pallet.",
      });
    }
    setDragId(null);
    setDragPos(null);
    setDragValid(true);
  }, [dragId, dragPos, dragValid, placedCases, onUpdateCases, commitCases]);

  // ── Shared manipulation system (identical in the Trailer Builder) ─────────
  const deleteIds = useCallback(
    (ids: string[]) => {
      if (!onUpdateCases || ids.length === 0) return;
      commitCases(placedCases.filter((c) => !ids.includes(c.id)));
      onSelectCase(null);
      toast.success(ids.length > 1 ? `${ids.length} items removed` : "Item removed");
    },
    [onUpdateCases, commitCases, placedCases, onSelectCase],
  );

  const undo = useCallback(() => {
    if (!onUpdateCases) return;
    const prev = historyRef.current.undo(placedCases);
    if (!prev) return;
    onUpdateCases(prev);
  }, [onUpdateCases, placedCases]);

  const redo = useCallback(() => {
    if (!onUpdateCases) return;
    const next = historyRef.current.redo(placedCases);
    if (!next) return;
    onUpdateCases(next);
  }, [onUpdateCases, placedCases]);

  const focusOn = useCallback(
    (id: string) => {
      const c = placedCases.find((x) => x.id === id);
      if (!c) return;
      const { w, l } = footprintOf(c);
      const baseY = baseYFor(placedCases, { x: c.x, y: c.y, w, l }, c.z, 5, c.id);
      setFocus({
        center: {
          x: -selectedPallet.width / 2 + c.x + w / 2,
          y: baseY + c.height / 2,
          z: -selectedPallet.length / 2 + c.y + l / 2,
        },
        radius: Math.max(w, l, c.height) * 0.5,
        nonce: Date.now(),
      });
    },
    [placedCases, selectedPallet],
  );

  /** Shift + wheel — raise / lower the selection one layer at a time. */
  const nudgeVertical = useCallback(
    (ids: string[], delta: number) => {
      if (!onUpdateCases || ids.length === 0) return;
      const dir = delta > 0 ? 1 : -1;
      commitCases(
        placedCases.map((c) => (ids.includes(c.id) ? { ...c, z: Math.max(1, c.z + dir) } : c)),
      );
    },
    [onUpdateCases, commitCases, placedCases],
  );

  const manip = useManipulation({
    targetRef: wrapperRef,
    enabled: interactive,
    selectedId: selectedCaseId,
    onSelect: onSelectCase,
    onDelete: deleteIds,
    onUndo: undo,
    onRedo: redo,
    onFocus: focusOn,
    onResetCamera: () => controllerRef.current?.setView("reset"),
    onVerticalNudge: nudgeVertical,
  });
  const { mode, setMode, snapping, setSnapping } = manip;

  /** Move the selection to a specific height (vertical gizmo / R mode). */
  const moveToHeight = useCallback(
    (id: string, worldY: number) => {
      const c = placedCases.find((x) => x.id === id);
      if (!c) return;
      const { w, l } = footprintOf(c);
      const targetBase = worldY - c.height / 2;
      const topLayer = placedCases.reduce((m, p) => Math.max(m, p.z), 0) + 1;
      let best: { layer: number; baseY: number } | null = null;
      for (let layer = 1; layer <= topLayer; layer++) {
        if (settleLayer(placedCases, { x: c.x, y: c.y, w, l }, id, layer) !== layer) continue;
        const by = baseYFor(placedCases, { x: c.x, y: c.y, w, l }, layer, 5, id);
        if (!best || Math.abs(by - targetBase) < Math.abs(best.baseY - targetBase)) {
          best = { layer, baseY: by };
        }
      }
      if (!best) return;
      setDragPos({ x: c.x, y: c.y, z: best.layer, baseY: best.baseY });
      setDragValid(true);
    },
    [placedCases],
  );

  const handleGizmoTransform = useCallback(
    (
      id: string,
      t: { deckX: number; deckY: number; worldY: number; euler: { x: number; y: number; z: number } },
    ) => {
      if (mode === "rotate") {
        handleFreeRotate(id, t.euler);
        return;
      }
      if (mode === "vertical") {
        moveToHeight(id, t.worldY);
        return;
      }
      handleDragMove(t.deckX, t.deckY);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, moveToHeight, handleDragMove],
  );

  // ── Selected-case actions ────────────────────────────────────────────────
  const selectedCase = useMemo(
    () => placedCases.find((c) => c.id === selectedCaseId) || null,
    [placedCases, selectedCaseId]
  );

  const handleRotateSelected = useCallback(() => {
    if (!selectedCase || !onUpdateCases) return;
    if (selectedCase.allowRotation === false) {
      toast.info("This item's rotation is locked");
      return;
    }
    const newRot = (selectedCase.rotation + 90) % 360;
    const newW = newRot === 90 || newRot === 270 ? selectedCase.length : selectedCase.width;
    const newL = newRot === 90 || newRot === 270 ? selectedCase.width : selectedCase.length;
    if (!inBounds(selectedCase.x, selectedCase.y, newW, newL)) {
      toast.info("Can't rotate here", { description: "Would extend beyond the pallet edge" });
      return;
    }
    // Rotation changes the footprint → re-run gravity for the new footprint.
    const check = validatePlacement(
      placedCases,
      { x: selectedCase.x, y: selectedCase.y, w: newW, l: newL },
      selectedPallet.width,
      selectedPallet.length,
      selectedCase.id
    );
    if (!check.ok) {
      toast.info("Can't rotate here", { description: check.reason });
      return;
    }
    commitCases(placedCases.map((c) => (c.id === selectedCase.id
      ? { ...c, rotation: newRot, rotationX: 0, rotationY: newRot, rotationZ: 0, z: check.layer ?? c.z }
      : c)));
  }, [selectedCase, onUpdateCases, placedCases, inBounds, commitCases, selectedPallet]);

  // Live free-rotation commit from the 3D gizmo — mirrors Euler angles into the
  // placed case. Physics/bounds updates flow through the same state pipeline.
  const handleFreeRotate = useCallback(
    (id: string, euler: { x: number; y: number; z: number }) => {
      if (!onUpdateCases) return;
      commitCases(
        placedCases.map((c) =>
          c.id === id
            ? {
                ...c,
                rotationX: euler.x,
                rotationY: euler.y,
                rotationZ: euler.z,
                // Keep legacy rotation aligned to yaw for compat with 2D views.
                rotation: ((Math.round(euler.y) % 360) + 360) % 360,
              }
            : c
        )
      );
    },
    [onUpdateCases, placedCases, commitCases]
  );

  const handleResetRotation = useCallback(() => {
    if (!selectedCase || !onUpdateCases) return;
    commitCases(
      placedCases.map((c) =>
        c.id === selectedCase.id
          ? { ...c, rotationX: 0, rotationY: 0, rotationZ: 0, rotation: 0 }
          : c
      )
    );
  }, [selectedCase, onUpdateCases, placedCases, commitCases]);

  const handleSetAxis = useCallback(
    (axis: "x" | "y" | "z", deg: number) => {
      if (!selectedCase || !onUpdateCases) return;
      const cleaned = isFinite(deg) ? deg : 0;
      onUpdateCases(
        placedCases.map((c) => {
          if (c.id !== selectedCase.id) return c;
          const patch: Partial<PlacedCase> =
            axis === "x"
              ? { rotationX: cleaned }
              : axis === "y"
              ? { rotationY: cleaned, rotation: ((Math.round(cleaned) % 360) + 360) % 360 }
              : { rotationZ: cleaned };
          return { ...c, ...patch };
        })
      );
    },
    [selectedCase, onUpdateCases, placedCases]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedCase || !onUpdateCases) return;
    // Removing a support makes anything above it fall — gravity handles it.
    commitCases(placedCases.filter((c) => c.id !== selectedCase.id));
    onSelectCase(null);
  }, [selectedCase, onUpdateCases, placedCases, onSelectCase, commitCases]);

  // ── Add from library: find first free slot on current layer ──────────────
  const handleAddFromLibrary = useCallback(
    (item: PalletLibraryItem) => {
      if (!onUpdateCases) return;
      const w = Number(item.width);
      const l = Number(item.length);
      const h = Number(item.height);
      const wt = Number(item.weight);
      if (!(w > 0 && l > 0 && h > 0 && wt > 0)) {
        if (onRequestDimensions) {
          ensureModalVisible();
          onRequestDimensions(item);
        } else {
          ensureModalVisible();
          toast.info("Add dimensions first", {
            description: "Switch to 2D and add this item — we'll prompt for size and weight.",
          });
        }
        return;
      }
      if (w > selectedPallet.width || l > selectedPallet.length) {
        toast.info("Item too large", { description: `Doesn't fit on a ${selectedPallet.width}×${selectedPallet.length} pallet.` });
        return;
      }
      // First-fit scan in 1" increments — gravity picks the lowest supported
      // layer for each candidate footprint, so items always land on something.
      let placed: { x: number; y: number; z: number } | null = null;
      outer: for (let y = 0; y <= selectedPallet.length - l; y++) {
        for (let x = 0; x <= selectedPallet.width - w; x++) {
          const layer = settleLayer(placedCases, { x, y, w, l });
          if (layer != null) {
            placed = { x, y, z: layer };
            break outer;
          }
        }
      }
      if (!placed) {
        toast.info("No supported spot left", { description: "Rearrange items to open up a flat surface." });
        return;
      }
      placeItemAt(item, placed.x, placed.y, placed.z);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUpdateCases, selectedPallet, placedCases, selectedLayer, checkCollision, onSelectCase, onRequestDimensions]
  );

  /** Insert a library item at a specific pallet coordinate (top-left in inches). */
  const placeItemAt = useCallback(
    (item: PalletLibraryItem, x: number, y: number, z?: number) => {
      if (!onUpdateCases) return;
      const w = Number(item.width);
      const l = Number(item.length);
      const h = Number(item.height);
      const wt = Number(item.weight);
      // Final gravity pass before commit: snap X/Y, then drop to the lowest
      // fully-supported layer. Never commit a floating box.
      const snapped = snapXY(x, y, w, l);
      const layer = settleLayer(placedCases, { x: snapped.x, y: snapped.y, w, l });
      if (layer == null) {
        ensureModalVisible();
        toast.info("Can't place here", {
          description: "Nothing solid underneath — drop it on the deck or on top of a box.",
        });
        return;
      }
      const newCase: PlacedCase = {
        id: `placed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        caseId: item.name,
        caseType: item.category || "Standard",
        x: snapped.x,
        y: snapped.y,
        z: layer,
        rotation: 0,
        width: w,
        length: l,
        height: h,
        weight: wt,
        condition: item.condition || "good",
        fragile: item.fragile,
        category: item.category || undefined,
        allowRotation: item.allowRotation !== false,
        source: item.source,
        sourceId: item.sourceId,
      };
      commitCases([...placedCases, newCase]);
      onSelectCase(newCase.id);
      toast.success("Placed on pallet", { description: item.name });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUpdateCases, placedCases, onSelectCase, commitCases, snapXY, ensureModalVisible]
  );

  /** Convert a mouse event over the canvas to pallet-top-left (x,y) inches. */
  const screenToPalletCoords = useCallback(
    (clientX: number, clientY: number, w: number, l: number): { x: number; y: number } | null => {
      const cam = cameraRef.current;
      const canvas = canvasElRef.current || wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!cam || !canvas) return null;
      canvasElRef.current = canvas;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1)
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, cam as THREE.PerspectiveCamera);
      // Intersect with horizontal plane at deck top (y = 5)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5);
      const hit = new THREE.Vector3();
      const ok = raycaster.ray.intersectPlane(plane, hit);
      if (!ok) return null;
      const px = Math.round(hit.x + selectedPallet.width / 2 - w / 2);
      const py = Math.round(hit.z + selectedPallet.length / 2 - l / 2);
      return { x: px, y: py };
    },
    [selectedPallet]
  );

  /** Ray-pick a horizontal plane at world height `planeY` → pallet-space point. */
  const screenToPlanePoint = useCallback(
    (clientX: number, clientY: number, planeY: number): { x: number; y: number } | null => {
      const cam = cameraRef.current;
      const canvas = canvasElRef.current || (wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null);
      if (!cam || !canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1)
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, cam as THREE.PerspectiveCamera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x + selectedPallet.width / 2, y: hit.z + selectedPallet.length / 2 };
    },
    [selectedPallet]
  );

  /**
   * Resolve a screen-space drop point to the closest fully-supported slot.
   * 1. Ray-pick the deck plane → raw X/Y.
   * 2. Magnetic snap to pallet edges / neighbour faces (gap filling).
   * 3. Gravity settle to the lowest layer with >= 95% support and no overlap.
   * 4. If that fails, spiral outward for the nearest supported slot.
   */
  const resolveDropSlot = useCallback(
    (
      clientX: number,
      clientY: number,
      w: number,
      l: number
    ): { x: number; y: number; z: number; valid: boolean } | null => {
      const coords = screenToPalletCoords(clientX, clientY, w, l);
      if (!coords) return null;
      if (w > selectedPallet.width || l > selectedPallet.length) {
        return { x: coords.x, y: coords.y, z: 1, valid: false };
      }
      const clampX = (v: number) => Math.max(0, Math.min(v, selectedPallet.width - w));
      const clampY = (v: number) => Math.max(0, Math.min(v, selectedPallet.length - l));

      // 0) Stack assist — ray-pick each occupied top surface (highest first).
      // If the pointer is over a box's top face, stack there instead of
      // dropping all the way down to the pallet deck.
      const bases = computeBaseYMap(placedCases, 5);
      const surfaces = Array.from(
        new Set(placedCases.map((c) => (bases.get(c.id) ?? 5) + (c.height || 0)))
      ).sort((a, b) => b - a);
      for (const topY of surfaces) {
        const p = screenToPlanePoint(clientX, clientY, topY);
        if (!p) continue;
        const over = placedCases.some((c) => {
          const f = footprintOf(c);
          if (Math.abs((bases.get(c.id) ?? 5) + (c.height || 0) - topY) > 0.01) return false;
          return p.x >= c.x && p.x <= c.x + f.w && p.y >= c.y && p.y <= c.y + f.l;
        });
        if (!over) continue;
        const stack = stackSlotOver(p.x, p.y, w, l);
        if (stack) return { ...stack, valid: true };
        break;
      }

      // Nearest supported slot: cursor first, then rings of 1" offsets.
      for (let r = 0; r <= 30; r++) {
        const offsets: Array<{ dx: number; dy: number }> =
          r === 0
            ? [{ dx: 0, dy: 0 }]
            : [];
        if (r > 0) {
          for (let d = -r; d <= r; d++) {
            offsets.push({ dx: d, dy: -r }, { dx: d, dy: r }, { dx: -r, dy: d }, { dx: r, dy: d });
          }
        }
        // Closest offsets first for a natural magnetic feel.
        offsets.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
        for (const o of offsets) {
          const snapped = snapXY(clampX(coords.x + o.dx), clampY(coords.y + o.dy), w, l);
          const layer = settleLayer(placedCases, { x: snapped.x, y: snapped.y, w, l });
          if (layer != null) return { x: snapped.x, y: snapped.y, z: layer, valid: true };
        }
      }
      return { x: clampX(coords.x), y: clampY(coords.y), z: 1, valid: false };
    },
    [screenToPalletCoords, screenToPlanePoint, stackSlotOver, placedCases, selectedPallet, snapXY]
  );

  const handleWrapperDragOver = useCallback(
    (e: React.DragEvent) => {
      const hasExternal = Array.from(e.dataTransfer.types || []).includes("application/json");
      if (!dragLibraryRef.current && !hasExternal) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      const item = dragLibraryRef.current;
      if (!item) return; // external drag: allow drop but skip preview (payload only readable on drop)
      const w = Number(item.width) || 0;
      const l = Number(item.length) || 0;
      const h = Number(item.height) || 6;
      if (!(w > 0 && l > 0)) return;
      const resolved = resolveDropSlot(e.clientX, e.clientY, w, l);
      if (!resolved) return;
      setExternalDragHover({
        x: resolved.x,
        y: resolved.y,
        z: resolved.z,
        baseY: baseYFor(placedCases, { x: resolved.x, y: resolved.y, w, l }, resolved.z, 5),
        w,
        l,
        h,
      });
      setExternalDragValid(resolved.valid);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPallet, resolveDropSlot, placedCases]
  );

  const handleWrapperDrop = useCallback(
    (e: React.DragEvent) => {
      let item = dragLibraryRef.current;
      if (!item) {
        try {
          const raw = e.dataTransfer.getData("application/json");
          if (raw) item = JSON.parse(raw) as PalletLibraryItem;
        } catch {}
      }
      dragLibraryRef.current = null;
      setExternalDragHover(null);
      if (!item) return;
      e.preventDefault();
      const w = Number(item.width);
      const l = Number(item.length);
      const h = Number(item.height);
      const wt = Number(item.weight);
      if (!(w > 0 && l > 0 && h > 0 && wt > 0)) {
        if (onRequestDimensions) {
          ensureModalVisible();
          onRequestDimensions(item);
        } else {
          ensureModalVisible();
          toast.info("Add dimensions first", {
            description: "Switch to 2D and set this item's size and weight.",
          });
        }
        return;
      }
      if (w > selectedPallet.width || l > selectedPallet.length) {
        toast.info("Item too large", { description: `Doesn't fit on a ${selectedPallet.width}×${selectedPallet.length} pallet.` });
        return;
      }
      // Try to resolve the pointer to a valid slot (auto-stack + fallback scan).
      const resolved = resolveDropSlot(e.clientX, e.clientY, w, l);
      if (resolved && resolved.valid) {
        placeItemAt(item, resolved.x, resolved.y, resolved.z);
        return;
      }
      // Fallback: first-fit scan for the lowest fully-supported slot anywhere.
      for (let y = 0; y <= selectedPallet.length - l; y++) {
        for (let x = 0; x <= selectedPallet.width - w; x++) {
          const layer = settleLayer(placedCases, { x, y, w, l });
          if (layer != null) {
            placeItemAt(item, x, y, layer);
            return;
          }
        }
      }
      toast.info("No supported spot left", { description: "Rearrange or remove items and try again." });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPallet, inBounds, checkCollision, selectedLayer, placeItemAt, onRequestDimensions, placedCases]
  );

  const handleWrapperDragLeave = useCallback(() => {
    setExternalDragHover(null);
  }, []);

  // Filter library by search
  const filteredLibrary = useMemo(() => {
    if (!libraryItems) return [];
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryItems.slice(0, 100);
    return libraryItems
      .filter((i) => i.name.toLowerCase().includes(q) || (i.subtitle || "").toLowerCase().includes(q))
      .slice(0, 100);
  }, [libraryItems, librarySearch]);

  const maxLayer = useMemo(() => placedCases.reduce((m, c) => Math.max(m, c.z), 0), [placedCases]);

  const hoveredCase = useMemo(
    () => placedCases.find((c) => c.id === hoveredId) || null,
    [placedCases, hoveredId]
  );

  const handleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 min-h-0 viewport-studio overflow-hidden"
      onDragOver={handleWrapperDragOver}
      onDrop={handleWrapperDrop}
      onDragLeave={handleWrapperDragLeave}
    >
      {/* Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [80, 70, 80], fov: 35, near: 0.1, far: 2000 }}
        onPointerMissed={() => onSelectCase(null)}
        onDoubleClick={() => {
          if (selectedCaseId) focusOn(selectedCaseId);
          else controllerRef.current?.setView("reset");
        }}
      >
        <Suspense fallback={null}>
          <Scene
            pallet={selectedPallet}
            cases={placedCases}
            selectedCaseId={selectedCaseId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={onSelectCase}
            layerLimit={layerLimit}
            xray={xray}
            heatmap={heatmap}
            showCOG={showCOG}
            showMeasurements={showMeasurements}
            exploded={exploded}
            controllerRef={controllerRef}
            autoRotate={autoRotate}
            controlsRef={controlsRef}
            dragId={dragId}
            dragPos={dragPos}
            dragValid={dragValid}
            ghost={
              externalDragHover
                ? {
                    x: externalDragHover.x,
                    y: externalDragHover.y,
                    baseY: externalDragHover.baseY,
                    w: externalDragHover.w,
                    l: externalDragHover.l,
                    h: externalDragHover.h,
                    valid: externalDragValid,
                  }
                : null
            }
            onDragStart={interactive ? handleDragStart : undefined}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            rotationSnapDeg={rotationSnapDeg}
            onFreeRotate={interactive ? handleFreeRotate : undefined}
            mode={mode}
            snapping={snapping}
            focus={focus}
            onGizmoDragStart={interactive ? handleDragStart : undefined}
            onGizmoDragEnd={interactive ? handleDragEnd : undefined}
            onGizmoTransform={interactive ? handleGizmoTransform : undefined}
          />
          <CameraCapture cameraRef={cameraRef} />
        </Suspense>
      </Canvas>

      {/* Selected carton action HUD — top center */}
      {interactive && selectedCase && !dragId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 viewport-glass animate-fade-in">
          <div className="text-xs">
            <div className="font-semibold text-foreground leading-tight max-w-[180px] truncate">{selectedCase.caseId}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {selectedCase.width}×{selectedCase.length}×{selectedCase.height}" · {selectedCase.weight} lb · Layer {selectedCase.z}
            </div>
          </div>
          <div className="w-px h-7 bg-border/60" />
          <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-[11px]" onClick={handleRotateSelected}>
            <RotateCw className="h-3 w-3" />
            Rotate
          </Button>
          <Button
            size="sm"
            variant={mode === "rotate" ? "default" : "outline"}
            className="h-7 px-2 gap-1 text-[11px]"
            onClick={() => setMode(mode === "rotate" ? "move" : "rotate")}
            title="Rotate mode (E) — free 360° gizmo"
          >
            <Move3D className="h-3 w-3" />
            Free Rotate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 gap-1 text-[11px] text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {/* Free Rotation panel — precise numeric control, snap presets, reset */}
      {interactive && selectedCase && mode === "rotate" && (() => {
        const e = getEulerDeg(selectedCase);
        const round = (n: number) => Math.round(n * 10) / 10;
        return (
          <div className="absolute top-16 right-3 z-20 w-64 p-3 viewport-glass animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Move3D className="h-3.5 w-3.5" />
                Free Rotation
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={handleResetRotation}
                title="Reset rotation to 0°"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
              Drag the coloured rings on the item, or type exact angles below. Physics, bounds and stability update live.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["x", "y", "z"] as const).map((axis) => (
                <div key={axis}>
                  <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        axis === "x" && "bg-red-500",
                        axis === "y" && "bg-green-500",
                        axis === "z" && "bg-blue-500"
                      )}
                    />
                    {axis.toUpperCase()} ({axis === "x" ? "Pitch" : axis === "y" ? "Yaw" : "Roll"})
                  </label>
                  <Input
                    type="number"
                    className="h-7 mt-0.5 text-[11px] tabular-nums px-2"
                    value={round(e[axis])}
                    step={rotationSnapDeg > 0 ? rotationSnapDeg : 1}
                    onChange={(ev) => handleSetAxis(axis, parseFloat(ev.target.value))}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Magnet className="h-3 w-3" />
                Snap
              </div>
              <div className="flex items-center gap-1">
                {[0, 15, 30, 45, 90].map((v) => (
                  <button
                    key={v}
                    onClick={() => setRotationSnapDeg(v)}
                    className={cn(
                      "h-6 px-1.5 rounded text-[10px] font-medium border transition-colors tabular-nums",
                      rotationSnapDeg === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent"
                    )}
                  >
                    {v === 0 ? "Off" : `${v}°`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Library panel — left side, for adding items in 3D (esp. fullscreen) */}
      {interactive && libraryItems && libraryItems.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 left-3 z-20 h-7 px-2 gap-1 text-[11px] bg-background/90 backdrop-blur"
            onClick={() => setLibraryOpen((v) => !v)}
          >
            {libraryOpen ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
            {libraryOpen ? "Hide Items" : "Add Items"}
          </Button>
          {libraryOpen && (
            <div className="absolute top-12 left-3 z-20 w-64 max-h-[calc(100%-5rem)] flex flex-col viewport-glass overflow-hidden animate-fade-in">
              <div className="p-2 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search items…"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Click to auto-place on layer {selectedLayer}.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {filteredLibrary.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">No items found</p>
                ) : (
                  filteredLibrary.map((item) => {
                    const hasDims = !!(item.width && item.length && item.height && item.weight);
                    return (
                      <button
                        key={`${item.source}-${item.id}`}
                        onClick={() => handleAddFromLibrary(item)}
                          draggable
                        onDragStart={(e) => {
                          dragLibraryRef.current = item;
                          e.dataTransfer.effectAllowed = "copy";
                          try {
                            e.dataTransfer.setData("text/plain", item.name);
                              e.dataTransfer.setData("application/json", JSON.stringify(item));
                          } catch {}
                        }}
                        onDragEnd={() => {
                          dragLibraryRef.current = null;
                          setExternalDragHover(null);
                        }}
                        className="w-full text-left p-2 rounded-md border border-border/40 bg-card hover:bg-accent hover:border-primary/40 transition-colors flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                      >
                        <div
                          className="h-7 w-7 rounded shrink-0 border border-border/40"
                          style={{ backgroundColor: colorForCategory(item.category || undefined, item.name) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-foreground truncate">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                              {hasDims ? `${item.width}×${item.length}×${item.height}" · ${item.weight} lb · drag onto pallet` : "Drag onto pallet — we'll ask for size"}
                          </div>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Toolbar — top right */}
      <TooltipProvider delayDuration={200}>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-1 p-1.5 viewport-glass">
            {([
              { v: "iso", label: "Isometric", icon: <BoxIcon className="h-3.5 w-3.5" /> },
              { v: "top", label: "Top View", icon: <span className="text-[10px] font-bold">T</span> },
              { v: "front", label: "Front View", icon: <span className="text-[10px] font-bold">F</span> },
              { v: "side", label: "Side View", icon: <span className="text-[10px] font-bold">S</span> },
            ] as { v: ViewPreset; label: string; icon: React.ReactNode }[]).map((p) => (
              <Tooltip key={p.v}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => controllerRef.current?.setView(p.v)}
                  >
                    {p.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{p.label}</TooltipContent>
              </Tooltip>
            ))}
            <div className="w-px h-4 bg-border/60 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => controllerRef.current?.setView("reset")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Reset Camera (double-click)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoRotate ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAutoRotate((v) => !v)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Auto Rotate</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 p-1.5 viewport-glass">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={xray ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setXray((v) => !v)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">X-Ray Mode</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={heatmap ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setHeatmap((v) => !v)}
                >
                  <Flame className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Weight Heatmap</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showCOG ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowCOG((v) => !v)}
                >
                  <Target className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Center of Gravity</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showMeasurements ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowMeasurements((v) => !v)}
                >
                  <Ruler className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Measurements</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={exploded ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setExploded((v) => !v)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Exploded View</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border/60 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => controllerRef.current?.screenshot()}
                >
                  <CameraIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Screenshot</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFullscreen}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Fullscreen</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Shared mode toolbar + controls legend (identical in the Trailer Builder) */}
      {interactive && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <ModeToolbar
              mode={mode}
              onMode={setMode}
              snapping={snapping}
              onToggleSnapping={() => setSnapping((v) => !v)}
              onFocus={selectedCaseId ? () => focusOn(selectedCaseId) : undefined}
              focusDisabled={!selectedCaseId}
            />
          </div>
          <ControlsLegend className="absolute bottom-3 right-3 z-20" />
        </>
      )}

      {/* Layer slider — bottom left */}
      {maxLayer > 1 && (
        <div className="absolute bottom-3 left-3 z-10 w-60 p-3.5 viewport-glass">
          <div className="flex items-center gap-2 mb-2">
            <LayersIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {layerLimit === 0 ? `Showing all ${maxLayer} layers` : `Showing layers 1 – ${layerLimit}`}
            </span>
          </div>
          <Slider
            value={[layerLimit === 0 ? maxLayer : layerLimit]}
            onValueChange={(v) => setLayerLimit(v[0] === maxLayer ? 0 : v[0])}
            min={1}
            max={maxLayer}
            step={1}
          />
        </div>
      )}

      {/* Hover tooltip — bottom center, follows hovered case */}
      {hoveredCase && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3.5 py-2.5 viewport-glass text-xs animate-fade-in">
          <div className="font-semibold text-foreground mb-0.5">{hoveredCase.caseId}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              Dim: {hoveredCase.width}×{hoveredCase.length}×{hoveredCase.height}"
            </span>
            <span>Weight: {hoveredCase.weight} lb</span>
            <span>Category: {hoveredCase.category || "—"}</span>
            <span>Rotation: {hoveredCase.rotation}°</span>
            <span>Layer: {hoveredCase.z}</span>
            {hoveredCase.fragile && <span className="text-destructive font-medium">Fragile</span>}
          </div>
        </div>
      )}

      {/* Empty hint */}
      {placedCases.length === 0 && (
        externalDragHover ? null :
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-8 py-6 viewport-glass">
            <p className="text-sm font-medium text-muted-foreground">No items placed yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Drag an item from the panel on the left onto the pallet — or click to auto-place.
            </p>
          </div>
        </div>
      )}

      {/* Live drop indicator while dragging from library */}
      {externalDragHover && (
        <div
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md border shadow-md text-[11px] font-medium backdrop-blur",
            externalDragValid
              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/15 border-destructive/50 text-destructive"
          )}
        >
          {externalDragValid
            ? `Drop to place at (${externalDragHover.x}", ${externalDragHover.y}") · Layer ${externalDragHover.z} · settles onto support`
            : "No supported spot here — needs the deck or a flat box top"}
        </div>
      )}
    </div>
  );
}
