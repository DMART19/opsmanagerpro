import { PalletBuilderSidebar } from "./PalletBuilderSidebar";
import type { ComponentProps } from "react";

/**
 * Thin mobile wrapper around `<PalletBuilderSidebar mobileSection="pallet">`.
 * Renders the compact "Selected Pallet" card with inline picker.
 * All logic lives in the sidebar — this component only exists so the mobile
 * page composition reads cleanly.
 */
export const MobileSelectedPalletCard = (
  props: Omit<ComponentProps<typeof PalletBuilderSidebar>, "mobileSection">
) => <PalletBuilderSidebar {...props} mobileSection="pallet" />;