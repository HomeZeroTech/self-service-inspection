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
const LABELS = ['a person', 'a radiator', 'an electricity meter', 'a boiler'];
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
