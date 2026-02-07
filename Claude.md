# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time webcam image classification using WebGPU-accelerated ML inference in the browser. Designed for home inspection workflows (identifying radiators, meter boxes, boilers, etc.).

**Tech Stack**: Vite + React 18 + TypeScript, @huggingface/transformers v3, SigLIP2 vision model

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Regenerate Text Embeddings

Required after adding new labels:

```bash
npx tsx scripts/generate-embeddings.ts
```

## Architecture

### Vision-Only Inference Pattern

Instead of loading both SigLIP2 vision and text models (~378MB total), we:

1. Pre-compute text embeddings at build time (`scripts/generate-embeddings.ts`)
2. Store embeddings in `src/data/labelEmbeddings.ts`
3. Load only vision model at runtime (~95MB)
4. Compare embeddings using cosine similarity with temperature scaling

### Web Worker Pattern

ML inference runs in `src/workers/visionClassifier.worker.ts` to keep main thread responsive:

- Singleton worker instance prevents duplicate model loads
- Message-based communication for init and classify operations
- `src/hooks/useVisionClassifier.ts` manages worker lifecycle from React

### Key Data Flow

1. `WebcamClassifier.tsx` orchestrates camera + classifier
2. `useFrameCapture.ts` captures frames every 500ms
3. Worker classifies frames and returns top 3 results
4. `ClassificationOverlay.tsx` displays results

## Configuration

### Classification Labels

Edit in `src/components/WebcamClassifier.tsx`:

```typescript
const LABELS = ["a person", "a radiator", "an electricity meter", "a boiler"];
```

Labels must exist in `src/data/labelEmbeddings.ts`. To add new labels:

1. Add to `ALL_LABELS` in `scripts/generate-embeddings.ts`
2. Run `npx tsx scripts/generate-embeddings.ts`
3. Update `LABELS` array in `WebcamClassifier.tsx`

### Model Configuration

- Model: `onnx-community/siglip2-base-patch16-224-ONNX`
- Quantization: 8-bit (`dtype: 'q8'`)
- Capture interval: 500ms

## Browser Requirements

- WebGPU: Chrome 113+, Edge 113+ (falls back to WASM)
- HTTPS required for camera access
- Cross-Origin Isolation headers configured in `vite.config.ts` for SharedArrayBuffer

## Score Interpretation

SigLIP2 produces probability distributions, not binary scores:

- 50-80% = strong match
- 20-40% = possible match
- Scores won't reach 100% because probability is distributed across all candidates

## Desktop Redirect Screen

The app is designed for mobile use (camera access required). Desktop users see a redirect screen instead of the camera interface.

**Device Detection:**

- `useDeviceType` hook detects mobile vs desktop (screen width < 768px OR mobile user agent)
- Desktop users see `DesktopRedirectPage` component
- Mobile users see normal inspection camera flow

**Desktop Screen Features:**

- **QR Code**: Dynamically generated with current URL
    - Local development: Uses internal IP (via WebRTC) so phones on same WiFi can connect
    - Production: Uses actual domain URL
- **Step Preview**: Shows all inspection steps from `session.allSteps` API field
    - Each step displays: step number, display name, and subtitle
- **Lottie Animation**: Placeholder at `src/assets/animations/phone-scan.json`
- **Speech Bubbles**: Friendly message guiding user to scan QR code

**Implementation:**

- Component: `src/pages/DesktopRedirectPage.tsx`
- Hooks: `src/hooks/useDeviceType.ts`, `src/hooks/useQRCodeUrl.ts`
- Libraries: `qrcode.react`, `lottie-react`

## White-Label Architecture

This application is designed as a white-label solution where all branding is controlled by the backend API.

### Design System

**Color System:**

- Gray scale (gray-50 through gray-900) defined in `src/styles/theme.css`
- Primary color scale dynamically generated from API `primaryColor`
- Theme injection via `useTheme` hook and `ThemeProvider` component

**Design Tokens:**

- Spacing: `var(--space-1)` through `var(--space-16)`
- Typography: `var(--text-xs)` through `var(--text-3xl)`
- Colors: `var(--gray-50)` through `var(--gray-900)`, `var(--primary-50)` through `var(--primary-900)`
- Shadows: `var(--shadow-sm)` through `var(--shadow-xl)`
- Border radius: `var(--radius-sm)` through `var(--radius-full)`

**Usage:**

```tsx
// Use CSS variables in inline styles
<div style={{ padding: 'var(--space-4)', color: 'var(--gray-600)' }}>
  Content
</div>

// Or in CSS files
.button {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--primary-500);
}
```

### Branding Configuration

Branding is loaded from backend via `SessionConfig`:

- **Logo**: `branding.logoUrl` - Falls back to `src/assets/logo_home_zero.png`
- **Logo Height**: `branding.logoHeight` - Logo height in pixels (default: 40px)
- **Primary Color**: `branding.primaryColor` - Hex color generates full scale (50-900)
- **Title**: `branding.title` - App title shown in secondary header
- **Custom Text**: `texts.{loadingMessage, successMessage, errorMessage}`

### Logo Display

- Displayed in fixed 62px height header at top of every page
- Logo is centered horizontally and vertically
- Logo height controlled by API (`logoHeight` field)
- Width scales proportionally to maintain aspect ratio
- Component: `src/components/branding/Header.tsx` and `src/components/branding/Logo.tsx`

### Mock Development Mode

Run locally without backend by omitting `VITE_API_BASE`:

- Mock API automatically activates
- Uses local logo asset (`/src/assets/logo_home_zero.png`)
- Pre-configured inspection steps (radiator, energy meter, boiler)
- See `src/api/mocks.ts` for mock data

**Environment Variables:**

```bash
# Optional: Backend API URL
VITE_API_BASE=https://api.example.com

# Omit to use mock API for local development
```

### Color Theming

Primary color from API generates complete color scale:

1. API provides `primaryColor` (e.g., "#0ea5e9")
2. `generateColorScale()` creates shades 50-900 using HSL manipulation
3. CSS variables injected into `:root` as `--primary-50` through `--primary-900`
4. All components use CSS variables for consistent theming

**Implementation:** `src/utils/colorScale.ts` and `src/hooks/useTheme.ts`

### Adding New Colors

To add custom colors to the design system:

1. Define in `src/styles/theme.css` as CSS variables
2. Use throughout components via `var(--color-name)`
3. Update `src/styles/tokens.ts` TypeScript definitions

### Backend API Documentation

See [BACKEND_API.md](./BACKEND_API.md) for complete API documentation including:

- Endpoint specifications
- White-label configuration
- Image handling
- Security considerations
