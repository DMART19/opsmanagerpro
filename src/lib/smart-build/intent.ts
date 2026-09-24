/**
 * Intent Engine — tracks recent cursor motion to bias candidate scoring
 * toward whichever placement the user is most likely aiming for.
 */

import type { Cursor } from "./types";

interface Sample {
  x: number;
  y: number;
  t: number;
}

export class IntentTracker {
  private samples: Sample[] = [];
  private readonly maxAgeMs = 250;

  push(x: number, y: number, t: number = performance.now()): Cursor {
    this.samples.push({ x, y, t });
    while (this.samples.length && t - this.samples[0].t > this.maxAgeMs) {
      this.samples.shift();
    }
    return this.read(x, y);
  }

  reset() {
    this.samples = [];
  }

  private read(x: number, y: number): Cursor {
    if (this.samples.length < 2) return { x, y, dir: null, speed: 0 };
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    const dt = Math.max(1, b.t - a.t) / 1000;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) return { x, y, dir: null, speed: 0 };
    return { x, y, dir: { x: dx / dist, y: dy / dist }, speed: dist / dt };
  }
}

/** Score how well a candidate aligns with the current cursor intent. */
export function intentAlignment(
  cursor: Cursor,
  targetX: number,
  targetY: number,
): number {
  if (!cursor.dir) return 0;
  const dx = targetX - cursor.x;
  const dy = targetY - cursor.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return 1;
  const ux = dx / d;
  const uy = dy / d;
  const dot = ux * cursor.dir.x + uy * cursor.dir.y;
  return Math.max(0, dot);
}
