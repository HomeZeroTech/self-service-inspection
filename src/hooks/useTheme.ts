import { useEffect } from 'react';
import { generateColorScale } from '../utils/colorScale';

/**
 * Theme Management Hook
 *
 * Dynamically injects primary color scale from API into CSS variables.
 * Updates document root styles when primary color changes.
 */
export function useTheme(primaryColor?: string) {
  useEffect(() => {
    if (!primaryColor) {
      // No primary color provided, use default from theme.css
      return;
    }

    // Generate color scale from API primary color
    const scale = generateColorScale(primaryColor);

    // Inject CSS variables into document root
    Object.entries(scale).forEach(([shade, color]) => {
      document.documentElement.style.setProperty(`--primary-${shade}`, color);
    });

    // Cleanup: reset to defaults on unmount (optional)
    return () => {
      // Note: We don't reset here to avoid flicker when switching between pages
      // The default values in theme.css will be used if no color is set
    };
  }, [primaryColor]);
}
