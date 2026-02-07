import { useState, useEffect } from "react";

/**
 * Hook to get the current page URL for QR code generation.
 * In development mode with localhost, attempts to use the internal IP
 * so devices on the same network can access the page.
 *
 * @returns The URL to use for QR code
 */
export function useQRCodeUrl(): string {
    const [url, setUrl] = useState<string>(window.location.href);

    useEffect(() => {
        const currentUrl = new URL(window.location.href);

        // Only try to get internal IP if we're on localhost
        if (
            currentUrl.hostname === "localhost" ||
            currentUrl.hostname === "127.0.0.1"
        ) {
            // Use WebRTC to discover local IP
            getInternalIP()
                .then((internalIP) => {
                    if (internalIP) {
                        currentUrl.hostname = internalIP;
                        setUrl(currentUrl.toString());
                    }
                })
                .catch(() => {
                    // Fallback to original URL if WebRTC fails
                    setUrl(window.location.href);
                });
        } else {
            setUrl(window.location.href);
        }
    }, []);

    return url;
}

/**
 * Get internal IP address using WebRTC
 */
async function getInternalIP(): Promise<string | null> {
    return new Promise((resolve) => {
        // Fallback timeout
        const timeout = setTimeout(() => resolve(null), 2000);

        try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel("");

            pc.onicecandidate = (event) => {
                if (!event.candidate) return;

                // Parse the candidate to extract IP
                const candidate = event.candidate.candidate;
                const ipMatch = candidate.match(
                    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/,
                );

                if (ipMatch) {
                    const ip = ipMatch[1];
                    // Filter out local-only addresses
                    if (!ip.startsWith("127.") && !ip.startsWith("0.")) {
                        clearTimeout(timeout);
                        pc.close();
                        resolve(ip);
                    }
                }
            };

            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .catch(() => {
                    clearTimeout(timeout);
                    resolve(null);
                });
        } catch {
            clearTimeout(timeout);
            resolve(null);
        }
    });
}
