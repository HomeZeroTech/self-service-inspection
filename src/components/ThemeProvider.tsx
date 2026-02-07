import { ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useInspectionStore } from '../store/inspectionStore';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider Component
 *
 * Wraps the application and injects dynamic primary colors from the API.
 * Reads session config from Zustand store and applies theme via useTheme hook.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const session = useInspectionStore((state) => state.session);
  const primaryColor = session?.config.branding.primaryColor;

  // Apply theme (injects CSS variables into document root)
  useTheme(primaryColor);

  // No loading spinner needed - theme applies instantly with defaults from theme.css
  return <>{children}</>;
}
