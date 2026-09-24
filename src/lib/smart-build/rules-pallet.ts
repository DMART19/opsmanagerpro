import type { RuleSet } from "./types";

export const palletRules: RuleSet = {
  kind: "pallet",
  allowOverhang: false,
  minSupport: 0.75,
  maxLayers: 8,
  maxHeight: 84,
  floorOnly: false,
};
