/**
 * FeatureLockBanner - Inline banner shown at top of gated pages.
 * Non-blocking: page remains fully interactive beneath it.
 */

import { GatedFeature } from "@/contexts/SubscriptionContext";

interface FeatureLockBannerProps {
  feature: GatedFeature;
  requiredPlan: string;
}

// Upgrade banners disabled globally — component intentionally renders nothing.
export const FeatureLockBanner = (_props: FeatureLockBannerProps) => null;
