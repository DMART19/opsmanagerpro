import { useState, useEffect } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

export function useDeviceType(): DeviceType | undefined {
  const [device, setDevice] = useState<DeviceType | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w <= MOBILE_MAX) setDevice("mobile");
      else if (w <= TABLET_MAX) setDevice("tablet");
      else setDevice("desktop");
    };

    update();

    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const mqlTablet = window.matchMedia(`(max-width: ${TABLET_MAX}px)`);

    const handler = () => update();
    mqlMobile.addEventListener("change", handler);
    mqlTablet.addEventListener("change", handler);

    return () => {
      mqlMobile.removeEventListener("change", handler);
      mqlTablet.removeEventListener("change", handler);
    };
  }, []);

  return device;
}
