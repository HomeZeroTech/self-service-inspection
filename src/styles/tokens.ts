/**
 * Design Tokens for White-Label Application
 *
 * TypeScript definitions for design system tokens.
 * These correspond to CSS custom properties defined in theme.css.
 */

// Gray scale colors
export const GRAY_COLORS = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

// Primary colors (defaults - dynamically overridden by API)
export const PRIMARY_COLORS = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
} as const;

// Utility colors
export const UTILITY_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

// Spacing scale (in rem)
export const SPACING = {
  0: 0,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
  5: 1.25,
  6: 1.5,
  8: 2,
  10: 2.5,
  12: 3,
  16: 4,
} as const;

// Typography scale (in rem)
export const TYPOGRAPHY = {
  xs: 0.75,
  sm: 0.875,
  base: 1,
  lg: 1.125,
  xl: 1.25,
  '2xl': 1.5,
  '3xl': 1.875,
} as const;

// Shadow definitions
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
} as const;

// Border radius (in rem)
export const BORDER_RADIUS = {
  sm: 0.125,
  md: 0.375,
  lg: 0.5,
  xl: 0.75,
  full: 9999,
} as const;

// Type definitions for design tokens
export type GrayShade = keyof typeof GRAY_COLORS;
export type PrimaryShade = keyof typeof PRIMARY_COLORS;
export type SpacingKey = keyof typeof SPACING;
export type TypographyKey = keyof typeof TYPOGRAPHY;
export type ShadowKey = keyof typeof SHADOWS;
export type RadiusKey = keyof typeof BORDER_RADIUS;
