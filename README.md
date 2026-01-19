# Digital Inspection

Real-time webcam classification for home inspections using browser-based ML.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in Chrome/Edge (WebGPU required).

## What It Does

Point your camera at objects and the app classifies them in real-time. Built for home inspection workflows - identifying radiators, meter boxes, boilers, electrical panels, etc.

## Model

- **Xenova/clip-vit-base-patch32** (~88MB download)
- CLIP vision encoder with pre-computed text embeddings
- Runs entirely in-browser using WebGPU (falls back to WASM)

## How It Works

1. Text embeddings for labels are pre-computed at build time
2. Only the vision model downloads at runtime (~88MB vs ~153MB for full CLIP)
3. Inference runs in a Web Worker to keep UI smooth
4. Frames captured every 500ms and classified

## Changing Labels

Labels are configured in [src/components/WebcamClassifier.tsx](src/components/WebcamClassifier.tsx):

```typescript
const LABELS = ['a person', 'a radiator', 'an electricity meter', 'a boiler'];
```

To add new labels:

1. Add to `ALL_LABELS` in [scripts/generate-embeddings.ts](scripts/generate-embeddings.ts)
2. Run `npx tsx scripts/generate-embeddings.ts`
3. Update `LABELS` in WebcamClassifier.tsx

## Score Interpretation

CLIP scores are probability distributions across labels:
- 50-70% = strong match
- 20-40% = possible match
- <20% = unlikely

Scores won't reach 100% because probability is distributed across all candidates.

## Requirements

- Chrome 113+ or Edge 113+ (WebGPU)
- Camera permissions
- ~500MB GPU memory recommended

## Key Files

| File | Purpose |
|------|---------|
| `src/workers/visionClassifier.worker.ts` | ML inference (Web Worker) |
| `src/hooks/useVisionClassifier.ts` | React hook for classifier |
| `src/data/labelEmbeddings.ts` | Pre-computed text embeddings |
| `scripts/generate-embeddings.ts` | Generates text embeddings |

## License

MIT
