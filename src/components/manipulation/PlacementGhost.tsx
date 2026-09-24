import { Edges, Html } from "@react-three/drei";

/**
 * Translucent placement preview shared by both builders.
 * Green = valid placement, red = collision / invalid.
 */
export default function PlacementGhost({
  center,
  size,
  valid,
  label,
}: {
  /** World-space centre (three.js axes). */
  center: [number, number, number];
  /** [width, height, length] in inches. */
  size: [number, number, number];
  valid: boolean;
  label?: string;
}) {
  const color = valid ? "#22c55e" : "#ef4444";
  const edge = valid ? "#16a34a" : "#dc2626";
  return (
    <group position={center}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} transparent opacity={0.32} depthWrite={false} />
        <Edges color={edge} />
      </mesh>
      {/* Footprint shadow on the surface below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -size[1] / 2 + 0.2, 0]}>
        <planeGeometry args={[size[0], size[2]]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {label && (
        <Html position={[0, size[1] / 2 + 2, 0]} center distanceFactor={70} style={{ pointerEvents: "none" }}>
          <div
            className="px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border backdrop-blur-sm"
            style={{
              color: valid ? "#bbf7d0" : "#fecaca",
              borderColor: valid ? "#16a34a" : "#dc2626",
              background: "rgba(12,16,20,0.75)",
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
