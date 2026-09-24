import type { RuleSet, Reason, PlacedObject, World } from "./types";

export const trailerRules: RuleSet = {
  kind: "trailer",
  allowOverhang: false,
  minSupport: 0.9,
  floorOnly: true,
  maxHeight: 110,
  extraValidate: (obj: PlacedObject, world: World): Reason[] => {
    const reasons: Reason[] = [];
    for (const p of world.placed) {
      if (p.id === obj.id) continue;
      if (obj.y + obj.length <= p.y) {
        reasons.push({
          code: "blocks_unloading",
          message: "Placing behind an existing item blocks unloading order.",
        });
        break;
      }
    }
    return reasons;
  },
};
