# Digital Inspection

## Quick Start

```bash
npm install
npm run dev
```

## What It Does

Point your camera at objects and the app classifies them in real-time. Built for home inspection workflows - identifying radiators, meter boxes, boilers, electrical panels, etc.

## Model

- **onnx-community/siglip2-base-patch16-224-ONNX** (~95MB download)
- SigLIP2 vision encoder with pre-computed text embeddings
- Better accuracy than CLIP for fine-grained classification
- Runs entirely in-browser using WebGPU (falls back to WASM)

## How It Works

1. Text embeddings for labels are pre-computed at build time
2. Only the vision model downloads at runtime (~95MB vs ~378MB for full SigLIP2)
3. Inference runs in a Web Worker to keep UI smooth
4. Frames captured every 500ms and classified

## Changing Labels

Labels are configured in [src/components/WebcamClassifier.tsx](src/components/WebcamClassifier.tsx):

```typescript
const LABELS = ["a person", "a radiator", "an electricity meter", "a boiler"];
```

To add new labels:

1. Add to `ALL_LABELS` in [scripts/generate-embeddings.ts](scripts/generate-embeddings.ts)
2. Run `npx tsx scripts/generate-embeddings.ts`
3. Update `LABELS` in WebcamClassifier.tsx

## Score Interpretation

SigLIP2 scores are probability distributions across labels:

- 50-80% = strong match
- 20-40% = possible match
- <20% = unlikely

Scores won't reach 100% because probability is distributed across all candidates. SigLIP2 generally produces more confident scores than CLIP.

## Key Files

| File                                     | Purpose                      |
| ---------------------------------------- | ---------------------------- |
| `src/workers/visionClassifier.worker.ts` | ML inference (Web Worker)    |
| `src/hooks/useVisionClassifier.ts`       | React hook for classifier    |
| `src/data/labelEmbeddings.ts`            | Pre-computed text embeddings |
| `scripts/generate-embeddings.ts`         | Generates text embeddings    |
