# Digital Inspection

Real-time webcam image classification using WebGPU-accelerated ML inference in the browser. Designed for home inspection workflows (identifying radiators, meter boxes, boilers, etc.).

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **ML Library**: @huggingface/transformers v3
- **Model**: onnx-community/siglip2-base-patch16-224-ONNX (SigLIP2, ~95MB vision model)
- **Webcam**: react-webcam with `facingMode: "environment"`
- **Acceleration**: WebGPU with WASM fallback

## Key Features

- **Vision-only inference** - Pre-computed text embeddings reduce model size from ~378MB to ~95MB
- **Web Worker** - ML inference runs off main thread for smooth UI
- **WebGPU acceleration** - Fast inference on supported browsers
- **Progress callback** - Shows model download progress
- **Device detection** - Checks WebGPU support, memory, and cross-origin isolation
- **Auto-start** - Classification begins immediately when model and camera are ready
- **Mobile-friendly** - Uses rear camera by default, responsive UI

## Project Structure

```
src/
├── components/
│   ├── WebcamClassifier.tsx      # Main orchestrating component
│   ├── LoadingProgress.tsx       # Model download progress UI
│   ├── ClassificationOverlay.tsx # Top 3 results overlay
│   └── DeviceCompatibility.tsx   # WebGPU status display
├── hooks/
│   ├── useVisionClassifier.ts    # Vision-only classifier with worker
│   ├── useClassifier.ts          # Full pipeline (unused, kept for reference)
│   ├── useDeviceCapabilities.ts  # WebGPU detection
│   └── useFrameCapture.ts        # 500ms interval frame capture
├── workers/
│   └── visionClassifier.worker.ts # Web Worker for ML inference
├── data/
│   └── labelEmbeddings.ts        # Pre-computed text embeddings
├── utils/
│   └── deviceChecks.ts           # WebGPU feature detection
├── types/
│   └── index.ts                  # TypeScript interfaces
├── App.tsx
├── App.css
├── index.css
└── main.tsx

scripts/
└── generate-embeddings.ts        # Script to pre-compute text embeddings
```

## Architecture

### Vision-Only Approach

Instead of loading both SigLIP2 vision and text models (~378MB total), we:

1. **Pre-compute text embeddings** at build time using `scripts/generate-embeddings.ts`
2. **Store embeddings** in `src/data/labelEmbeddings.ts`
3. **Load only vision model** at runtime (~95MB)
4. **Compare embeddings** using cosine similarity with temperature scaling

This reduces download size by ~75% while maintaining classification accuracy.

### Web Worker Pattern

The ML inference runs in a Web Worker (`visionClassifier.worker.ts`) to keep the main thread responsive:

- Singleton worker instance prevents duplicate model loads
- Message-based communication for init and classify operations
- Progress callbacks for model download status

### SigLIP2 Score Interpretation

SigLIP2 produces cosine similarity scores that are converted to probabilities:

1. Scaled by temperature (~10x for SigLIP2)
2. Converted to probabilities via softmax

A "match" typically shows 50-80% probability, not 100%. This is expected behavior. SigLIP2 generally provides better accuracy than CLIP, especially for fine-grained classification.

## Configuration

### Classification Labels

Edit labels in `src/components/WebcamClassifier.tsx`:

```typescript
const LABELS = ['a person', 'a radiator', 'an electricity meter', 'a boiler'];
```

**Important**: Labels must have pre-computed embeddings. After adding new labels:

```bash
npx tsx scripts/generate-embeddings.ts
```

### Available Labels (pre-computed)

See `scripts/generate-embeddings.ts` for all available labels:
- Heating: radiator, wall-mounted radiator, floor-mounted radiator, towel radiator, underfloor heating
- Meters: electricity meter, smart meter, gas meter, meter box, electrical panel, fuse box, circuit breaker panel
- Water heating: boiler, combi boiler, water heater, hot water cylinder, heat pump
- Insulation: wall insulation, loft insulation, cavity wall, solid wall
- Windows/doors: window, double glazed window, single glazed window, door, front door
- General: person, room, ceiling, wall, floor

### Model

```typescript
const MODEL_ID = 'onnx-community/siglip2-base-patch16-224-ONNX';
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

### Adding New Labels

1. Add labels to `ALL_LABELS` array in `scripts/generate-embeddings.ts`
2. Run `npx tsx scripts/generate-embeddings.ts`
3. Update `LABELS` array in `WebcamClassifier.tsx`

## Browser Requirements

- **WebGPU**: Chrome 113+, Edge 113+, or Firefox Nightly
- **HTTPS**: Required for secure context (WebGPU, camera access)
- **Cross-Origin Isolation**: Enabled via Vite dev server headers

## Architecture Notes

### COOP/COEP Headers

Required for SharedArrayBuffer (ONNX Runtime). Configured in `vite.config.ts`:

```typescript
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
```

Note: Using `credentialless` instead of `require-corp` to allow loading models from HuggingFace CDN.

### Device Fallback

If WebGPU is unavailable, automatically falls back to WASM backend.

### Model Quantization

Using `dtype: 'q8'` for 8-bit quantization to reduce model size while maintaining accuracy.
