import { useState, useEffect } from "react";

/**
 * Hook to detect if user is on mobile or desktop device.
 * Uses a combination of screen width and user agent detection.
 *
 * @returns 'mobile' | 'desktop'
 */
export function useDeviceType(): "mobile" | "desktop" {
    const [deviceType, setDeviceType] = useState<"mobile" | "desktop">(() => {
        // Initial check based on window width
        if (typeof window !== "undefined") {
            return window.innerWidth < 768 ? "mobile" : "desktop";
        }
        return "desktop";
    });

    useEffect(() => {
        const checkDevice = () => {
            const isMobileWidth = window.innerWidth < 768;
            const isMobileUserAgent =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent,
                );

            // Consider it mobile if either the width is small OR it's a mobile user agent
            setDeviceType(
                isMobileWidth || isMobileUserAgent ? "mobile" : "desktop",
            );
        };

        checkDevice();
        window.addEventListener("resize", checkDevice);
        return () => window.removeEventListener("resize", checkDevice);
    }, []);

    return deviceType;
}
