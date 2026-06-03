"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getPlatform, isMobileViewport, isNativePlatform, isTabletViewport } from "@/lib/platform/capacitor";

export type ShellMode = "mobile" | "web";

type DeviceContextValue = {
  isNative: boolean;
  isPhone: boolean;
  isTablet: boolean;
  platform: string;
  shellMode: ShellMode;
};

const DeviceContext = createContext<DeviceContextValue | null>(null);

function resolveDeviceState(): DeviceContextValue {
  const native = isNativePlatform();
  const phoneViewport = isMobileViewport();
  const tabletViewport = isTabletViewport();
  const platform = native ? getPlatform() : "web";
  const nativePhone = native && (platform === "android" || platform === "ios") && !tabletViewport;
  const isPhone = nativePhone || phoneViewport;
  const isTablet = !isPhone && tabletViewport;

  return {
    isNative: native,
    isPhone,
    isTablet,
    platform,
    shellMode: isPhone ? "mobile" : "web",
  };
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceContextValue>(resolveDeviceState);

  useEffect(() => {
    const updateDeviceState = () => {
      setDeviceState(resolveDeviceState());
    };

    updateDeviceState();
    window.addEventListener("resize", updateDeviceState);

    return () => {
      window.removeEventListener("resize", updateDeviceState);
    };
  }, []);

  const value = useMemo(() => deviceState, [deviceState]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error("useDevice must be used within DeviceProvider.");
  }

  return context;
}
