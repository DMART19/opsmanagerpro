import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,

  Html,
  RoundedBox,
  Outlines,
  Edges,
  Line,
  Grid,
} from "@react-three/drei";
import * as THREE from "three";
import {
  ManipulationCamera,
  TransformGizmo,
  ControlsLegend,
  ModeToolbar,
  type FocusRequest,
} from "@/components/manipulation";
import { useManipulation } from "@/hooks/use-manipulation";
import type { TransformMode } from "@/lib/manipulation/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  Eye,
  Flame,
  Ruler,
  Target,
  Box as BoxIcon,
  RefreshCw,
  Trash2,
  RotateCw,
  Plus,
  PanelRightOpen,
  PanelRightClose,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { PlacedPallet } from "@/types/trailer-builder";
import { getStopColor } from "@/types/trailer-builder";
import type { CustomTrailer } from "@/hooks/use-custom-trailers";
import type { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { resolvePlacement } from "@/lib/smart-build/engine";
import { trailerRules } from "@/lib/smart-build/rules-trailer";

/**
 * 3D trailer visualization.
 *
 * Mirrors {@link PalletCanvas3D} but adapted for trailer loading — each
 * pallet becomes a stack (deck + cartons) placed on the trailer floor.
 * Consumes the same {@link PlacedPallet}[] the 2D canvas does. Selection
 * is two-way synced with the parent via {@link onSelectPallet}.
 */
export interface TrailerCanvas3DProps {
  trailer: CustomTrailer;
  placedPallets: PlacedPallet[];
  selectedPalletId: string | null;
  onSelectPallet: (id: string | null) => void;
  /** Optional — enables drag/rotate/delete of placed pallets */
  onUpdatePallet?: (id: string, updates: Partial<PlacedPallet>) => void;
  onRemovePallet?: (id: string) => void;
  onPlacePallet?: (pallet: PlacedPallet) => void;
  /** Library of pallets to drag into the trailer (HTML5 DnD) */
  libraryPallets?: SavedPalletBuild[];
  /** Called when the user exits fullscreen — parent should drop back to 2D */
  onExitFullscreen?: () => void;
}

// ── helpers ─────────────────────────────────────────────────────────────────
const DECK_H = 5; // inches — pallet base thickness
const WOOD_COLOR = "#c9a06b";
const WOOD_DARK = "#9a7448";

// Studio look — matches the Pallet Builder viewport
const STUDIO_BG = "#171b21";
const STUDIO_FLOOR = "#1b2027";
const TRAILER_DECK = "#252b33";

function palletWeight(p: SavedPalletBuild): number {
  return p.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
}

function palletCargoHeight(p: SavedPalletBuild): number {
  const cases = p.pallet_data.placedCases;
  if (cases.length === 0) return 12;
  const layerH = new Map<number, number>();
  for (const c of cases) layerH.set(c.z, Math.max(layerH.get(c.z) || 0, c.height || 0));
  let total = 0;
  for (const h of layerH.values()) total += h;
  return total || 12;
}

function palletFootprint(p: PlacedPallet): { w: number; l: number } {
  const d = p.palletData.pallet_data.palletDimensions;
  const rotated = p.rotation === 90 || p.rotation === 270;
  return { w: rotated ? d.length : d.width, l: rotated ? d.width : d.length };
}

function heatColor(weight: number, max: number): string {
  const t = Math.max(0, Math.min(1, weight / Math.max(1, max)));
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

// Stable color hash fallback for pallets without a stopNumber
const FALLBACK = ["#6366f1", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b", "#ec4899", "#8b5cf6"];
function hashColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}

function colorFor(p: PlacedPallet): string {
  if (p.stopNumber) {
    const s = getStopColor(p.stopNumber);
    // extract the HSL string from "hsl(142 70% 45%)"
    return s.border;
  }
  return hashColor(p.id);
}

// ── Pallet deck ─────────────────────────────────────────────────────────────
function PalletDeck({ width, length, height }: { width: number; length: number; height: number }) {
  const blockH = height * 0.55;
  const topBoardH = height * 0.18;
  const stringerH = height - blockH - topBoardH;
  const blockW = Math.min(width, length) * 0.16;
  return (
    <group>
      <RoundedBox args={[width, topBoardH, length]} radius={0.4} smoothness={2} position={[0, height - topBoardH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[width * 0.96, stringerH, length * 0.96]} radius={0.3} smoothness={2} position={[0, blockH + stringerH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </RoundedBox>
      {[-1, 0, 1].map((ix) =>
        [-1, 0, 1].map((iz) => (
          <RoundedBox key={`b-${ix}-${iz}`} args={[blockW, blockH, blockW]} radius={0.25} smoothness={2}
            position={[(width / 2 - blockW / 2) * ix, blockH / 2, (length / 2 - blockW / 2) * iz]} castShadow receiveShadow>
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </RoundedBox>
        ))
      )}
    </group>
  );
}

// ── One pallet stack on the trailer floor ───────────────────────────────────
interface StackProps {
  p: PlacedPallet;
  trailerW: number;
  trailerL: number;
  color: string;
  isSelected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  opacity: number;
  showLabels: boolean;
  isDragging?: boolean;
  dragValid?: boolean;
  dragOverrideX?: number;
  dragOverrideY?: number;
  onDragStart?: (id: string) => void;
}

function PalletStack({
  p, trailerW, trailerL, color, isSelected, hovered, onHover, onSelect,
  opacity, showLabels, isDragging, dragValid, dragOverrideX, dragOverrideY, onDragStart,
}: StackProps) {
  const { w, l } = palletFootprint(p);
  const cargoH = palletCargoHeight(p.palletData);

  const effX = isDragging && dragOverrideX !== undefined ? dragOverrideX : p.x;
  const effY = isDragging && dragOverrideY !== undefined ? dragOverrideY : p.y;
  const cx = -trailerW / 2 + effX + w / 2;
  const cz = -trailerL / 2 + effY + l / 2;
  const cy = (hovered || isSelected || isDragging ? 0.4 : 0) + (isDragging ? 2 : 0);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const k = Math.min(1, dt * (isDragging ? 18 : 14));
    const pos = groupRef.current.position;
    pos.x += (cx - pos.x) * k;
    pos.y += (cy - pos.y) * k;
    pos.z += (cz - pos.z) * k;
  });

  const dragColor = isDragging ? (dragValid ? "#22c55e" : "#ef4444") : color;

  return (
    <group ref={groupRef} position={[cx, cy, cz]}>
      {/* Deck */}
      <PalletDeck width={w} length={l} height={DECK_H} />
      {/* Cargo box */}
      <RoundedBox
        args={[w * 0.98, cargoH, l * 0.98]}
        radius={0.4}
        smoothness={2}
        position={[0, DECK_H + cargoH / 2, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); onHover(p.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onHover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}
        onPointerDown={(e) => {
          if (!onDragStart) return;
          if ((e as any).button !== undefined && (e as any).button !== 0) return;
          e.stopPropagation();
          onSelect(p.id);
          onDragStart(p.id);
        }}
      >
        <meshStandardMaterial
          color={dragColor}
          roughness={0.72}
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

      {showLabels && (
        <Html position={[0, DECK_H + cargoH + 1, 0]} center distanceFactor={60} style={{ pointerEvents: "none", userSelect: "none" }}>
          <div className="px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/40 shadow-sm text-[10px] leading-tight font-medium text-foreground/90 whitespace-nowrap">
            <div className="truncate max-w-[100px]">{p.palletData.name}</div>
            <div className="text-[8px] text-muted-foreground tabular-nums">
              {p.stopNumber ? `Stop ${p.stopNumber} · ` : ""}{Math.round(palletWeight(p.palletData))}lb
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Trailer shell (floor + semi-transparent walls & roof) ───────────────────
function TrailerShell({
  width, length, height, xray, inside = false,
}: { width: number; length: number; height: number; xray: boolean; inside?: boolean }) {
  // Camera inside the trailer: fade the shell out so the load stays visible.
  const wallOpacity = inside ? 0 : xray ? 0.04 : 0.1;
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[width, 1, length]} />
        <meshStandardMaterial color={TRAILER_DECK} roughness={0.6} metalness={0.25} />
      </mesh>
      {/* Walls */}
      <mesh position={[-width / 2 - 0.5, height / 2, 0]} visible={!inside}>
        <boxGeometry args={[1, height, length]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={wallOpacity} depthWrite={false} />
      </mesh>
      <mesh position={[width / 2 + 0.5, height / 2, 0]} visible={!inside}>
        <boxGeometry args={[1, height, length]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={wallOpacity} depthWrite={false} />
      </mesh>
      {/* Front (cab) */}
      <mesh position={[0, height / 2, -length / 2 - 0.5]} visible={!inside}>
        <boxGeometry args={[width, height, 1]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={wallOpacity + 0.05} depthWrite={false} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, height + 0.5, 0]} visible={!inside}>
        <boxGeometry args={[width, 1, length]} />
        <meshStandardMaterial color="#bae6fd" transparent opacity={wallOpacity * 0.6} depthWrite={false} />
      </mesh>
      {/* Edge outline */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, length]} />
        <meshBasicMaterial visible={false} />
        <Edges color="#4b5a6b" threshold={1} />
      </mesh>
      {/* Front & Rear text markers */}
      <Html position={[0, 2, -length / 2 - 5]} center distanceFactor={90} style={{ pointerEvents: "none" }}>
        <div className="text-[10px] font-semibold tracking-wider text-slate-400">FRONT / CAB</div>
      </Html>
      <Html position={[0, 2, length / 2 + 5]} center distanceFactor={90} style={{ pointerEvents: "none" }}>
        <div className="text-[10px] font-semibold tracking-wider text-slate-400">REAR / DOOR</div>
      </Html>
    </group>
  );
}

// ── Center of gravity ───────────────────────────────────────────────────────
function CenterOfGravity({ pallets, trailerW, trailerL }: { pallets: PlacedPallet[]; trailerW: number; trailerL: number }) {
  const cog = useMemo(() => {
    if (pallets.length === 0) return null;
    let total = 0, sx = 0, sz = 0;
    for (const p of pallets) {
      const { w, l } = palletFootprint(p);
      const w0 = palletWeight(p.palletData);
      const cx = -trailerW / 2 + p.x + w / 2;
      const cz = -trailerL / 2 + p.y + l / 2;
      sx += cx * w0;
      sz += cz * w0;
      total += w0;
    }
    if (total === 0) return null;
    const x = sx / total, z = sz / total;
    const off = Math.hypot(x / (trailerW / 2), z / (trailerL / 2));
    const color = off < 0.2 ? "#22c55e" : off < 0.45 ? "#facc15" : "#ef4444";
    return { x, z, color };
  }, [pallets, trailerW, trailerL]);

  if (!cog) return null;
  return (
    <group>
      <mesh position={[cog.x, 30, cog.z]}>
        <sphereGeometry args={[3, 24, 24]} />
        <meshStandardMaterial color={cog.color} emissive={cog.color} emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      <Line points={[[cog.x, 0, cog.z], [cog.x, 30, cog.z]]} color={cog.color} lineWidth={2} />
    </group>
  );
}

// ── Measurements bbox ───────────────────────────────────────────────────────
function Measurements({ width, length, height }: { width: number; length: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, length]} />
        <meshBasicMaterial visible={false} />
        <Edges color="#0ea5e9" threshold={1} />
      </mesh>
      <Html position={[0, height + 6, length / 2 + 4]} center distanceFactor={80} style={{ pointerEvents: "none" }}>
        <div className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold whitespace-nowrap">
          {width.toFixed(0)}" × {length.toFixed(0)}" × {height.toFixed(0)}"
        </div>
      </Html>
    </group>
  );
}

// ── Camera rig ──────────────────────────────────────────────────────────────
type ViewPreset = "iso" | "top" | "front" | "side" | "reset";
interface CameraController {
  setView: (v: ViewPreset) => void;
  screenshot: () => void;
}

function CameraRig({
  controllerRef, width, length, height, controlsRef,
}: {
  controllerRef: React.MutableRefObject<CameraController | null>;
  width: number; length: number; height: number;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera, gl } = useThree();
  const radius = Math.max(width, length, height) * 0.9 + 60;

  const setView = useCallback((v: ViewPreset) => {
    const controls = controlsRef.current;
    if (!controls) return;
    switch (v) {
      case "top": camera.position.set(0, radius * 1.4, 0.01); break;
      case "front": camera.position.set(0, height / 2 + 20, -length / 2 - radius * 0.6); break;
      case "side": camera.position.set(radius, height / 2 + 20, 0); break;
      case "iso":
      case "reset":
      default: camera.position.set(radius * 0.55, radius * 0.55, radius * 0.9);
    }
    controls.target.set(0, height / 3, 0);
    controls.update();
  }, [camera, controlsRef, radius, height, length]);

  useEffect(() => {
    controllerRef.current = {
      setView,
      screenshot: () => {
        try {
          const data = gl.domElement.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = data;
          link.download = `trailer-3d-${Date.now()}.png`;
          link.click();
        } catch (e) { console.error(e); }
      },
    };
  }, [setView, gl, controllerRef]);

  useEffect(() => { setView("iso"); /* eslint-disable-next-line */ }, []);
  return null;
}

function CameraCapture({ cameraRef }: { cameraRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { camera } = useThree();
  useEffect(() => { cameraRef.current = camera; }, [camera, cameraRef]);
  return null;
}

// ── Scene ───────────────────────────────────────────────────────────────────
interface SceneProps {
  trailer: CustomTrailer;
  pallets: PlacedPallet[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  xray: boolean;
  heatmap: boolean;
  showCOG: boolean;
  showMeasurements: boolean;
  autoRotate: boolean;
  controllerRef: React.MutableRefObject<CameraController | null>;
  controlsRef: React.MutableRefObject<any>;
  dragId: string | null;
  dragPos: { x: number; y: number } | null;
  dragValid: boolean;
  /** Live drop preview footprint (inches, trailer-local) */
  ghost?: { x: number; y: number; w: number; l: number; h: number; valid: boolean } | null;
  onDragStart?: (id: string) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  /** Shared manipulation state (identical in the Pallet Builder). */
  mode: TransformMode;
  snapping: boolean;
  focus?: FocusRequest | null;
  onGizmoDragStart?: (id: string) => void;
  onGizmoDragEnd?: () => void;
  onGizmoTransform?: (
    id: string,
    t: { deckX: number; deckY: number; worldY: number; yaw: number },
  ) => void;
}

function Scene({
  trailer, pallets, selectedId, hoveredId, onHover, onSelect,
  xray, heatmap, showCOG, showMeasurements, autoRotate,
  controllerRef, controlsRef, dragId, dragPos, dragValid, ghost, onDragStart, onDragMove, onDragEnd,
  mode, snapping, focus, onGizmoDragStart, onGizmoDragEnd, onGizmoTransform,
}: SceneProps) {
  const maxWeight = useMemo(() => pallets.reduce((m, p) => Math.max(m, palletWeight(p.palletData)), 0), [pallets]);
  const { camera } = useThree();
  const [labelsOn, setLabelsOn] = useState(true);
  const [insideTrailer, setInsideTrailer] = useState(false);
  useFrame(() => {
    const dist = camera.position.length();
    const should = dist < Math.max(trailer.width, trailer.length) * 1.6;
    if (should !== labelsOn) setLabelsOn(should);
  });

  return (
    <>
      <color attach="background" args={[STUDIO_BG]} />
      <fog attach="fog" args={[STUDIO_BG, 500, 2600]} />
      {/* Key / fill / rim three-point lighting (matches Pallet Builder) */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#cfe0f5", "#0d1116", 0.55]} />
      <directionalLight
        position={[trailer.width, trailer.height * 3, trailer.length * 0.5]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-left={-trailer.width}
        shadow-camera-right={trailer.width}
        shadow-camera-top={trailer.length}
        shadow-camera-bottom={-trailer.length}
      />
      <directionalLight position={[-trailer.width, trailer.height * 2, -trailer.length * 0.3]} intensity={0.4} color="#8fb6e8" />
      <directionalLight position={[-trailer.width * 0.3, trailer.height, trailer.length]} intensity={0.28} color="#ffd9b0" />
      <Suspense fallback={null}>
        {/* Environment removed: HDR fetch fails in sandbox */}
      </Suspense>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.01, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color={STUDIO_FLOOR} roughness={0.62} metalness={0.22} />
      </mesh>
      <Grid
        position={[0, -0.99, 0]}
        args={[2000, 2000]}
        cellSize={12}
        cellThickness={0.5}
        cellColor="#2b333d"
        sectionSize={96}
        sectionThickness={1}
        sectionColor="#3d4a58"
        fadeDistance={1400}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
      />
      <ContactShadows
        position={[0, -0.99, 0]}
        opacity={0.6}
        scale={Math.max(trailer.width, trailer.length) * 3}
        blur={2.8}
        far={trailer.height + 40}
        color="#000000"
      />

      {/* Trailer shell */}
      <TrailerShell width={trailer.width} length={trailer.length} height={trailer.height} xray={xray} inside={insideTrailer} />

      {/* Pallets */}
      {pallets.map((p) => {
        const color = heatmap ? heatColor(palletWeight(p.palletData), maxWeight) : colorFor(p);
        const dragging = dragId === p.id;
        return (
          <PalletStack
            key={p.id}
            p={p}
            trailerW={trailer.width}
            trailerL={trailer.length}
            color={color}
            isSelected={selectedId === p.id}
            hovered={hoveredId === p.id}
            onHover={onHover}
            onSelect={onSelect}
            opacity={xray ? 0.7 : 1}
            showLabels={labelsOn}
            isDragging={dragging}
            dragValid={dragValid}
            dragOverrideX={dragging && dragPos ? dragPos.x : undefined}
            dragOverrideY={dragging && dragPos ? dragPos.y : undefined}
            onDragStart={onDragStart}
          />
        );
      })}

      {/* Drag plane */}
      {dragId && (() => {
        const p = pallets.find((x) => x.id === dragId);
        if (!p) return null;
        const { w, l } = palletFootprint(p);
        return (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]}
            onPointerMove={(e) => {
              e.stopPropagation();
              const px = Math.round(e.point.x + trailer.width / 2 - w / 2);
              const py = Math.round(e.point.z + trailer.length / 2 - l / 2);
              onDragMove?.(px, py);
            }}
            onPointerUp={(e) => { e.stopPropagation(); onDragEnd?.(); }}
            onPointerMissed={() => onDragEnd?.()}
          >
            <planeGeometry args={[10000, 10000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })()}

      {showCOG && pallets.length > 1 && (
        <CenterOfGravity pallets={pallets} trailerW={trailer.width} trailerL={trailer.length} />
      )}

      {/* Drop ghost — shows exactly where the pallet will land */}
      {ghost && (
        <group
          position={[
            -trailer.width / 2 + ghost.x + ghost.w / 2,
            ghost.h / 2,
            -trailer.length / 2 + ghost.y + ghost.l / 2,
          ]}
        >
          <mesh>
            <boxGeometry args={[ghost.w, ghost.h, ghost.l]} />
            <meshStandardMaterial
              color={ghost.valid ? "#22c55e" : "#ef4444"}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
            <Edges color={ghost.valid ? "#16a34a" : "#dc2626"} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ghost.h / 2 + 0.2, 0]}>
            <planeGeometry args={[ghost.w, ghost.l]} />
            <meshBasicMaterial
              color={ghost.valid ? "#22c55e" : "#ef4444"}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {showMeasurements && (
        <Measurements width={trailer.width} length={trailer.length} height={trailer.height} />
      )}

      {/* Shared 3-axis transform gizmo — identical in the Pallet Builder */}
      {selectedId && onGizmoTransform && (() => {
        const sp = pallets.find((p) => p.id === selectedId);
        if (!sp) return null;
        const { w, l } = palletFootprint(sp);
        const h = palletCargoHeight(sp.palletData);
        const live = dragId === sp.id && dragPos ? dragPos : null;
        const px = live ? live.x : sp.x;
        const py = live ? live.y : sp.y;
        const baseZ = sp.z ?? 0;
        return (
          <TransformGizmo
            mode={mode}
            size={Math.max(0.7, Math.min(trailer.width, trailer.length) / 160)}
            translationSnap={snapping ? 1 : undefined}
            rotationSnapDeg={90}
            transform={{
              x: -trailer.width / 2 + px + w / 2,
              y: baseZ + h / 2,
              z: -trailer.length / 2 + py + l / 2,
              rotX: 0,
              rotY: sp.rotation,
              rotZ: 0,
            }}
            onDragStart={() => onGizmoDragStart?.(sp.id)}
            onDragEnd={() => onGizmoDragEnd?.()}
            onChange={(n) =>
              onGizmoTransform(sp.id, {
                deckX: n.x + trailer.width / 2 - w / 2,
                deckY: n.z + trailer.length / 2 - l / 2,
                worldY: n.y,
                yaw: n.rotY,
              })
            }
          />
        );
      })()}

      <ManipulationCamera
        controlsRef={controlsRef}
        target={[0, trailer.height / 3, 0]}
        minDistance={Math.max(trailer.width, trailer.length) * 0.15}
        maxDistance={Math.max(trailer.width, trailer.length) * 4}
        autoRotate={autoRotate && !dragId}
        enabled={!dragId}
        focus={focus}
        interiorBounds={{ width: trailer.width, length: trailer.length, height: trailer.height }}
        onInteriorChange={setInsideTrailer}
      />
      <CameraRig
        controllerRef={controllerRef}
        controlsRef={controlsRef}
        width={trailer.width}
        length={trailer.length}
        height={trailer.height}
      />
    </>
  );
}

// ── Main wrapper ────────────────────────────────────────────────────────────
export default function TrailerCanvas3D({
  trailer,
  placedPallets,
  selectedPalletId,
  onSelectPallet,
  onUpdatePallet,
  onRemovePallet,
  onPlacePallet,
  libraryPallets,
  onExitFullscreen,
}: TrailerCanvas3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CameraController | null>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const dragLibraryRef = useRef<SavedPalletBuild | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [xray, setXray] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [showCOG, setShowCOG] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  const interactive = !!onUpdatePallet;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragValid, setDragValid] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [externalHover, setExternalHover] = useState<{ x: number; y: number; w: number; l: number } | null>(null);
  const [externalValid, setExternalValid] = useState(true);

  // Auto-open library when items exist so drag-and-drop into 3D is default.
  useEffect(() => {
    if (interactive && libraryPallets && libraryPallets.length > 0) setLibraryOpen(true);
  }, [interactive, libraryPallets]);

  // Auto-fullscreen on mount; notify parent when user exits fullscreen.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const req = el.requestFullscreen?.();
    if (req && typeof req.catch === "function") req.catch(() => {});
    const onChange = () => {
      const fs = document.fullscreenElement === el;
      if (!fs) onExitFullscreen?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement === el) document.exitFullscreen?.().catch(() => {});
    };
    // eslint-disable-next-line
  }, []);

  // ── Geometry helpers ──
  const checkCollision = useCallback(
    (x: number, y: number, w: number, l: number, excludeId: string) => {
      return placedPallets.some((p) => {
        if (p.id === excludeId) return false;
        const { w: pw, l: pl } = palletFootprint(p);
        const ox = Math.min(x + w, p.x + pw) - Math.max(x, p.x);
        const oy = Math.min(y + l, p.y + pl) - Math.max(y, p.y);
        return ox > 0.1 && oy > 0.1;
      });
    },
    [placedPallets]
  );

  const inBounds = useCallback(
    (x: number, y: number, w: number, l: number) =>
      x >= 0 && y >= 0 && x + w <= trailer.width && y + l <= trailer.length,
    [trailer]
  );

  /**
   * Magnetic snap — pulls a footprint flush to the trailer walls and to the
   * faces/edges of neighbouring pallets. Mirrors the Pallet Builder feel.
   */
  const snapXY = useCallback(
    (x: number, y: number, w: number, l: number, excludeId?: string, snap = 3) => {
      let nx = x;
      let ny = y;
      if (nx < snap) nx = 0;
      else if (trailer.width - (nx + w) < snap) nx = trailer.width - w;
      if (ny < snap) ny = 0;
      else if (trailer.length - (ny + l) < snap) ny = trailer.length - l;

      for (const p of placedPallets) {
        if (p.id === excludeId) continue;
        const { w: pw, l: pl } = palletFootprint(p);
        if (Math.abs(nx - (p.x + pw)) < snap) nx = p.x + pw;
        else if (Math.abs(nx + w - p.x) < snap) nx = p.x - w;
        else if (Math.abs(nx - p.x) < snap) nx = p.x;
        if (Math.abs(ny - (p.y + pl)) < snap) ny = p.y + pl;
        else if (Math.abs(ny + l - p.y) < snap) ny = p.y - l;
        else if (Math.abs(ny - p.y) < snap) ny = p.y;
      }
      return {
        x: Math.max(0, Math.min(Math.round(nx), Math.max(0, trailer.width - w))),
        y: Math.max(0, Math.min(Math.round(ny), Math.max(0, trailer.length - l))),
      };
    },
    [placedPallets, trailer]
  );

  // ── Drag handlers (existing pallets) ──
  const handleDragStart = useCallback((id: string) => {
    if (!interactive) return;
    const p = placedPallets.find((x) => x.id === id);
    if (!p) return;
    setDragId(id);
    setDragPos({ x: p.x, y: p.y });
    setDragValid(true);
  }, [interactive, placedPallets]);

  const handleDragMove = useCallback((rawX: number, rawY: number) => {
    if (!dragId) return;
    const p = placedPallets.find((x) => x.id === dragId);
    if (!p) return;
    const { w, l } = palletFootprint(p);
    const clampedX = Math.max(0, Math.min(rawX, trailer.width - w));
    const clampedY = Math.max(0, Math.min(rawY, trailer.length - l));
    const { x, y } = snapXY(clampedX, clampedY, w, l, dragId);
    const collides = checkCollision(x, y, w, l, dragId);
    setDragPos({ x, y });
    setDragValid(!collides && inBounds(x, y, w, l));
  }, [dragId, placedPallets, trailer, checkCollision, inBounds, snapXY]);

  const handleDragEnd = useCallback(() => {
    if (!dragId || !dragPos || !onUpdatePallet) {
      setDragId(null); setDragPos(null); return;
    }
    if (dragValid) {
      onUpdatePallet(dragId, { x: dragPos.x, y: dragPos.y });
    } else {
      toast.info("Can't place here", { description: "Position overlaps another pallet or is off the trailer." });
    }
    setDragId(null); setDragPos(null); setDragValid(true);
  }, [dragId, dragPos, dragValid, onUpdatePallet]);

  // ── Selected pallet actions ──
  const selectedPallet = useMemo(
    () => placedPallets.find((p) => p.id === selectedPalletId) || null,
    [placedPallets, selectedPalletId]
  );

  const handleRotateSelected = useCallback(() => {
    if (!selectedPallet || !onUpdatePallet) return;
    const newRot = selectedPallet.rotation === 0 ? 90 : 0;
    const d = selectedPallet.palletData.pallet_data.palletDimensions;
    const nw = newRot === 90 ? d.length : d.width;
    const nl = newRot === 90 ? d.width : d.length;
    if (!inBounds(selectedPallet.x, selectedPallet.y, nw, nl)) {
      toast.info("Can't rotate here", { description: "Would extend beyond the trailer edge" });
      return;
    }
    if (checkCollision(selectedPallet.x, selectedPallet.y, nw, nl, selectedPallet.id)) {
      toast.info("Can't rotate here", { description: "Another pallet is in the way" });
      return;
    }
    onUpdatePallet(selectedPallet.id, { rotation: newRot });
  }, [selectedPallet, onUpdatePallet, inBounds, checkCollision]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedPallet || !onRemovePallet) return;
    onRemovePallet(selectedPallet.id);
    onSelectPallet(null);
  }, [selectedPallet, onRemovePallet, onSelectPallet]);

  // ── Shared manipulation system (identical in the Pallet Builder) ──────────
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  const deleteIds = useCallback(
    (ids: string[]) => {
      if (!onRemovePallet) return;
      ids.forEach((id) => onRemovePallet(id));
      onSelectPallet(null);
    },
    [onRemovePallet, onSelectPallet],
  );

  const focusOn = useCallback(
    (id: string) => {
      const p = placedPallets.find((x) => x.id === id);
      if (!p) return;
      const { w, l } = palletFootprint(p);
      const h = palletCargoHeight(p.palletData);
      setFocus({
        center: {
          x: -trailer.width / 2 + p.x + w / 2,
          y: (p.z ?? 0) + h / 2,
          z: -trailer.length / 2 + p.y + l / 2,
        },
        radius: Math.max(w, l, h) * 0.5,
        nonce: Date.now(),
      });
    },
    [placedPallets, trailer],
  );

  const nudgeVertical = useCallback(
    (ids: string[], delta: number) => {
      if (!onUpdatePallet) return;
      ids.forEach((id) => {
        const p = placedPallets.find((x) => x.id === id);
        if (!p) return;
        onUpdatePallet(id, { z: Math.max(0, (p.z ?? 0) + delta) });
      });
    },
    [onUpdatePallet, placedPallets],
  );

  const manip = useManipulation({
    targetRef: wrapperRef,
    enabled: interactive,
    selectedId: selectedPalletId,
    onSelect: onSelectPallet,
    onDelete: deleteIds,
    onFocus: focusOn,
    onResetCamera: () => controllerRef.current?.setView("reset"),
    onVerticalNudge: nudgeVertical,
  });
  const { mode, setMode, snapping, setSnapping } = manip;

  const handleGizmoTransform = useCallback(
    (id: string, t: { deckX: number; deckY: number; worldY: number; yaw: number }) => {
      if (mode === "rotate") {
        if (!onUpdatePallet) return;
        const yaw = ((Math.round(t.yaw / 90) * 90) % 360 + 360) % 360;
        onUpdatePallet(id, { rotation: yaw });
        return;
      }
      if (mode === "vertical") {
        onUpdatePallet?.(id, { z: Math.max(0, Math.round(t.worldY)) });
        return;
      }
      handleDragMove(t.deckX, t.deckY);
    },
    [mode, onUpdatePallet, handleDragMove],
  );

  // ── Add from library (auto-place first fit) ──
  const handleAddFromLibrary = useCallback((pallet: SavedPalletBuild) => {
    if (!onPlacePallet) return;
    const d = pallet.pallet_data.palletDimensions;
    if (d.width > trailer.width || d.length > trailer.length) {
      toast.info("Pallet too large", { description: `Doesn't fit in a ${trailer.width}"×${trailer.length}" trailer.` });
      return;
    }
    let placed: { x: number; y: number } | null = null;
    const step = 6;
    outer: for (let y = 0; y + d.length <= trailer.length; y += step) {
      for (let x = 0; x + d.width <= trailer.width; x += step) {
        if (!checkCollision(x, y, d.width, d.length, "")) { placed = { x, y }; break outer; }
      }
    }
    if (!placed) {
      toast.info("No room on the trailer", { description: "Rearrange existing pallets to make space." });
      return;
    }
    const newPallet: PlacedPallet = {
      id: crypto.randomUUID(),
      palletId: pallet.id,
      x: placed.x,
      y: placed.y,
      rotation: 0,
      palletData: pallet,
    };
    onPlacePallet(newPallet);
    onSelectPallet(newPallet.id);
    toast.success("Placed on trailer", { description: pallet.name });
  }, [onPlacePallet, trailer, checkCollision, onSelectPallet]);

  // ── Screen → trailer coords (for HTML5 DnD drop) ──
  const screenToTrailer = useCallback((clientX: number, clientY: number, w: number, l: number): { x: number; y: number } | null => {
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
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    const px = Math.round(hit.x + trailer.width / 2 - w / 2);
    const py = Math.round(hit.z + trailer.length / 2 - l / 2);
    return { x: px, y: py };
  }, [trailer]);

  const handleWrapperDragOver = useCallback((e: React.DragEvent) => {
    if (!dragLibraryRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const p = dragLibraryRef.current;
    const d = p.pallet_data.palletDimensions;
    const coords = screenToTrailer(e.clientX, e.clientY, d.width, d.length);
    if (!coords) return;
    const cx = Math.max(0, Math.min(coords.x, trailer.width - d.width));
    const cy = Math.max(0, Math.min(coords.y, trailer.length - d.length));
    const { x, y } = snapXY(cx, cy, d.width, d.length);
    const ok = inBounds(x, y, d.width, d.length) && !checkCollision(x, y, d.width, d.length, "");
    setExternalHover({ x, y, w: d.width, l: d.length });
    setExternalValid(ok);
  }, [screenToTrailer, trailer, inBounds, checkCollision, snapXY]);

  const handleWrapperDrop = useCallback((e: React.DragEvent) => {
    const p = dragLibraryRef.current;
    dragLibraryRef.current = null;
    setExternalHover(null);
    if (!p || !onPlacePallet) return;
    e.preventDefault();
    const d = p.pallet_data.palletDimensions;
    const coords = screenToTrailer(e.clientX, e.clientY, d.width, d.length);
    if (!coords) return;
    // Smart Build Engine — magnetic snap, rotation suggestion, unloading-order check.
    const PALLET_HEIGHT = 48;
    const world = {
      width: trailer.width,
      length: trailer.length,
      placed: placedPallets.map((pp) => {
        const dims = pp.palletData.pallet_data.palletDimensions;
        const rotated = pp.rotation === 90 || pp.rotation === 270;
        return {
          id: pp.id,
          x: pp.x,
          y: pp.y,
          z: 0,
          width: rotated ? dims.length : dims.width,
          length: rotated ? dims.width : dims.length,
          height: PALLET_HEIGHT,
          weight: 0,
          rotation: pp.rotation,
          kind: "pallet" as const,
        };
      }),
    };
    const obj = {
      id: "candidate",
      width: d.width,
      length: d.length,
      height: PALLET_HEIGHT,
      weight: 0,
      rotation: 0,
      kind: "pallet" as const,
    };
    const result = resolvePlacement(
      obj,
      { x: coords.x + d.width / 2, y: coords.y + d.length / 2, dir: null, speed: 0 },
      world,
      trailerRules,
      { mode: "smart" },
    );
    if (!result.best || result.validation.level === "red") {
      const msg = result.validation.reasons[0]?.message ?? "Overlaps another pallet or off the trailer.";
      toast.info("Can't place here", { description: msg });
      return;
    }
    if (result.rotationSuggestion) {
      toast.info(result.rotationSuggestion.label, { description: "Applied automatically." });
    }
    const np: PlacedPallet = {
      id: crypto.randomUUID(),
      palletId: p.id,
      x: result.best.x,
      y: result.best.y,
      rotation: result.best.rotation,
      palletData: p,
    };
    onPlacePallet(np);
    onSelectPallet(np.id);
    toast.success("Placed on trailer", { description: p.name });
  }, [onPlacePallet, screenToTrailer, trailer, onSelectPallet, placedPallets]);

  const handleWrapperDragLeave = useCallback(() => setExternalHover(null), []);

  const filteredLibrary = useMemo(() => {
    if (!libraryPallets) return [];
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryPallets.slice(0, 100);
    return libraryPallets.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 100);
  }, [libraryPallets, librarySearch]);

  const hoveredPallet = useMemo(
    () => placedPallets.find((p) => p.id === hoveredId) || null,
    [placedPallets, hoveredId]
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
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [200, 200, 300], fov: 35, near: 0.1, far: 5000 }}
        onPointerMissed={() => onSelectPallet(null)}
        onDoubleClick={() => {
          if (selectedPalletId) focusOn(selectedPalletId);
          else controllerRef.current?.setView("reset");
        }}
      >
        <Suspense fallback={null}>
          <Scene
            trailer={trailer}
            pallets={placedPallets}
            selectedId={selectedPalletId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={onSelectPallet}
            xray={xray}
            heatmap={heatmap}
            showCOG={showCOG}
            showMeasurements={showMeasurements}
            autoRotate={autoRotate}
            controllerRef={controllerRef}
            controlsRef={controlsRef}
            dragId={dragId}
            dragPos={dragPos}
            dragValid={dragValid}
            ghost={
              externalHover
                ? {
                    x: externalHover.x,
                    y: externalHover.y,
                    w: externalHover.w,
                    l: externalHover.l,
                    h: 48,
                    valid: externalValid,
                  }
                : null
            }
            onDragStart={interactive ? handleDragStart : undefined}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
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

      {/* Shared mode toolbar + controls legend (identical in the Pallet Builder) */}
      {interactive && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <ModeToolbar
              mode={mode}
              onMode={setMode}
              snapping={snapping}
              onToggleSnapping={() => setSnapping((v) => !v)}
              onFocus={selectedPalletId ? () => focusOn(selectedPalletId) : undefined}
              focusDisabled={!selectedPalletId}
            />
          </div>
          <ControlsLegend className="absolute bottom-3 right-3 z-20" />
        </>
      )}

      {/* Selected pallet HUD */}
      {interactive && selectedPallet && !dragId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 viewport-glass animate-fade-in">
          <div className="text-xs">
            <div className="font-semibold text-foreground leading-tight max-w-[200px] truncate">{selectedPallet.palletData.name}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {palletFootprint(selectedPallet).w}×{palletFootprint(selectedPallet).l}" · {Math.round(palletWeight(selectedPallet.palletData))} lb
              {selectedPallet.stopNumber ? ` · Stop ${selectedPallet.stopNumber}` : ""}
            </div>
          </div>
          <div className="w-px h-7 bg-border/60" />
          <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-[11px]" onClick={handleRotateSelected}>
            <RotateCw className="h-3 w-3" /> Rotate
          </Button>
          {onRemovePallet && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1 text-[11px] text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
        </div>
      )}

      {/* Library panel — left */}
      {interactive && libraryPallets && libraryPallets.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 left-3 z-20 h-8 px-2.5 gap-1.5 text-[11px] viewport-glass hover:bg-white/10"
            onClick={() => setLibraryOpen((v) => !v)}
          >
            {libraryOpen ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
            {libraryOpen ? "Hide Pallets" : "Add Pallets"}
          </Button>
          {libraryOpen && (
            <div className="absolute top-12 left-3 z-20 w-64 max-h-[calc(100%-5rem)] flex flex-col viewport-glass overflow-hidden animate-fade-in">
              <div className="p-2 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search pallets…"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">Drag onto trailer — or click to auto-place.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {filteredLibrary.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">No pallets found</p>
                ) : (
                  filteredLibrary.map((pallet) => {
                    const d = pallet.pallet_data.palletDimensions;
                    const wt = palletWeight(pallet);
                    return (
                      <button
                        key={pallet.id}
                        onClick={() => handleAddFromLibrary(pallet)}
                        draggable
                        onDragStart={(e) => {
                          dragLibraryRef.current = pallet;
                          e.dataTransfer.effectAllowed = "copy";
                          try { e.dataTransfer.setData("text/plain", pallet.name); } catch {}
                        }}
                        onDragEnd={() => { dragLibraryRef.current = null; setExternalHover(null); }}
                        className="w-full text-left p-2 rounded-md border border-border/40 bg-card hover:bg-accent hover:border-primary/40 transition-colors flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                      >
                        <div
                          className="h-7 w-7 rounded shrink-0 border border-border/40"
                          style={{ backgroundColor: hashColor(pallet.id) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-foreground truncate">{pallet.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {d.width}×{d.length}" · {Math.round(wt)} lb · drag onto trailer
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => controllerRef.current?.setView(p.v)}>
                    {p.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{p.label}</TooltipContent>
              </Tooltip>
            ))}
            <div className="w-px h-4 bg-border/60 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => controllerRef.current?.setView("reset")}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Reset Camera (double-click)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={autoRotate ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setAutoRotate((v) => !v)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Auto Rotate</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 p-1.5 viewport-glass">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={xray ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setXray((v) => !v)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">X-Ray Mode</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={heatmap ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setHeatmap((v) => !v)}>
                  <Flame className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Weight Heatmap</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showCOG ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setShowCOG((v) => !v)}>
                  <Target className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Center of Gravity</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showMeasurements ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setShowMeasurements((v) => !v)}>
                  <Ruler className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Measurements</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border/60 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => controllerRef.current?.screenshot()}>
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

      {/* Hover tooltip */}
      {hoveredPallet && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-2 viewport-glass text-xs animate-fade-in">
          <div className="font-semibold text-foreground mb-0.5">{hoveredPallet.palletData.name}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>Footprint: {palletFootprint(hoveredPallet).w}×{palletFootprint(hoveredPallet).l}"</span>
            <span>Weight: {Math.round(palletWeight(hoveredPallet.palletData))} lb</span>
            <span>Rotation: {hoveredPallet.rotation}°</span>
            <span>Position: ({hoveredPallet.x}, {hoveredPallet.y})</span>
            {hoveredPallet.stopNumber && <span>Stop: {hoveredPallet.stopNumber}</span>}
          </div>
        </div>
      )}

      {/* Empty hint */}
      {placedPallets.length === 0 && !externalHover && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-7 py-5 viewport-glass">
            <p className="text-sm font-semibold text-foreground">Start loading the vehicle</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
              Drag a pallet from the panel on the left onto the deck — it snaps flush to walls and
              neighbouring pallets. Click a pallet to auto-place it.
            </p>
          </div>
        </div>
      )}

      {/* Live drop indicator */}
      {externalHover && (
        <div
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md border shadow-md text-[11px] font-medium backdrop-blur",
            externalValid
              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/15 border-destructive/50 text-destructive"
          )}
        >
          {externalValid
            ? `Snapped — drop to place at (${externalHover.x}", ${externalHover.y}")`
            : "Can't place here — overlaps or off trailer"}
        </div>
      )}
    </div>
  );
}