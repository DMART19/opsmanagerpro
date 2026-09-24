/**
 * SmartGuidance — Contextual guidance hints for container detail views
 * 
 * Shows inline hints inside container drawers when containers are empty,
 * items have never been moved, etc. Each hint includes an actionable CTA.
 */

import { GuidanceTooltip } from "@/components/guidance";
import { InlineHint } from "@/components/ui/inline-hint";
import { Box, ArrowRightLeft, Tag } from "lucide-react";

interface ContainerGuidanceProps {
  hasItems: boolean;
  containerName?: string;
  onAddItem?: () => void;
}

export const ContainerEmptyGuidance = ({ hasItems, containerName, onAddItem }: ContainerGuidanceProps) => {
  if (hasItems) return null;

  return (
    <GuidanceTooltip
      guidanceId="container_empty_items"
      message={`This container is empty. Add items to organize your inventory${containerName ? ` in "${containerName}"` : ""}.`}
      icon={Box}
      variant="minimal"
      action={onAddItem ? { label: "+ Add Item", onClick: onAddItem } : undefined}
    />
  );
};

export const MoveItemGuidance = () => {
  return (
    <InlineHint
      hintKey="move_item_discovery"
      icon={ArrowRightLeft}
      autoFadeMs={15000}
    >
      Items can be moved between storage areas and containers using the Move action.
    </InlineHint>
  );
};

export const AssetTagGuidance = () => {
  return (
    <InlineHint
      hintKey="asset_tag_hint"
      icon={Tag}
      autoFadeMs={10000}
    >
      Use barcodes or serial numbers to quickly find assets later.
    </InlineHint>
  );
};
