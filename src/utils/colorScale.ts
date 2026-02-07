/**
 * Color Scale Generation
 *
 * Generates a complete color scale (50-900) from a single base color (500).
 * Uses HSL color space for perceptually uniform lightness adjustments.
 */

interface HSL {
    h: number; // Hue: 0-360
    s: number; // Saturation: 0-100
    l: number; // Lightness: 0-100
}

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex: string): HSL {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / delta + 2) / 6;
                break;
            case b:
                h = ((r - g) / delta + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a complete color scale from a base color
 *
 * @param baseColor - Hex color for shade 500 (e.g., "#3b82f6")
 * @returns Object with shades 50-900
 */
export function generateColorScale(baseColor: string): Record<string, string> {
    const { h, s, l: _l } = hexToHSL(baseColor);

    // Generate lighter shades (50-400) by increasing lightness
    // Generate darker shades (600-900) by decreasing lightness
    return {
        "50": hslToHex(h, Math.max(s - 10, 10), 95),
        "100": hslToHex(h, Math.max(s - 5, 15), 90),
        "200": hslToHex(h, s, 80),
        "300": hslToHex(h, s, 70),
        "400": hslToHex(h, s, 60),
        "500": baseColor, // Original color
        "600": hslToHex(h, s, 40),
        "700": hslToHex(h, Math.min(s + 5, 95), 30),
        "800": hslToHex(h, Math.min(s + 10, 95), 22),
        "900": hslToHex(h, Math.min(s + 15, 95), 15),
    };
}
