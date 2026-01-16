# Digital Inspection

Real-time webcam image classification using WebGPU-accelerated ML inference in the browser.

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **ML Library**: @huggingface/transformers v3
- **Model**: onnx-community/siglip2-base-patch16-naflex-ONNX (SigLIP2 with NaFlex)
- **Webcam**: react-webcam with `facingMode: "environment"`
- **Acceleration**: WebGPU with WASM fallback

## Key Features

- **Zero-shot image classification** - No training required, just provide labels
- **WebGPU acceleration** - Fast inference on supported browsers
- **NaFlex support** - Native aspect ratio preservation (no forced square crops)
- **Progress callback** - Shows model download progress (~90MB)
- **Device detection** - Checks WebGPU support, memory, and cross-origin isolation
- **Auto-start** - Classification begins immediately when model and camera are ready
- **Mobile-friendly** - Uses rear camera by default, responsive UI

## Project Structure

```
src/
├── components/
│   ├── WebcamClassifier.tsx     # Main orchestrating component
│   ├── LoadingProgress.tsx      # Model download progress UI
│   ├── ClassificationOverlay.tsx # Top 3 results overlay
│   └── DeviceCompatibility.tsx  # WebGPU status display
├── hooks/
│   ├── useClassifier.ts         # ML pipeline initialization
│   ├── useDeviceCapabilities.ts # WebGPU detection
│   └── useFrameCapture.ts       # 500ms interval frame capture
├── utils/
│   └── deviceChecks.ts          # WebGPU feature detection
├── types/
│   └── index.ts                 # TypeScript interfaces
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

## Configuration

### Classification Labels

Edit labels in `src/components/WebcamClassifier.tsx`:

```typescript
const LABELS = ["a person", "a dog", "a sunset", "a plant"];
```

### Model

```typescript
const MODEL_ID = "onnx-community/siglip2-base-patch16-naflex-256";
```

### Capture Interval

```typescript
const CAPTURE_INTERVAL_MS = 500;
```

## Development

```bash
npm install
npm run dev
```

## Browser Requirements

- **WebGPU**: Chrome 113+, Edge 113+, or Firefox Nightly
- **HTTPS**: Required for secure context (WebGPU, camera access)
- **Cross-Origin Isolation**: Enabled via Vite dev server headers

## Architecture Notes

### COOP/COEP Headers

Required for SharedArrayBuffer (ONNX Runtime). Configured in `vite.config.ts`:

```typescript
res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
```

### NaFlex Aspect Ratio

Frames are captured at native aspect ratio (scaled down to ~320px width) instead of 224x224 square. The SigLIP2 NaFlex model handles variable aspect ratios.

### Device Fallback

If WebGPU is unavailable, automatically falls back to WASM backend.
