/**
 * Script to pre-compute text embeddings for classification labels.
 * Run with: npx tsx scripts/generate-embeddings.ts
 *
 * This generates embeddings once, so at runtime we only need the vision model (~88MB)
 * instead of both vision + text models (~153MB).
 */

import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

// All possible labels for home inspection
// Add all labels that will be used across all inspection steps
const ALL_LABELS = [
  // Heating
  'a radiator',
  'a wall-mounted radiator',
  'a floor-mounted radiator',
  'a towel radiator',
  'underfloor heating',

  // Meters and utilities
  'an electricity meter',
  'a smart meter',
  'a gas meter',
  'a meter box',
  'an electrical panel',
  'a fuse box',
  'a circuit breaker panel',

  // Water heating
  'a boiler',
  'a combi boiler',
  'a water heater',
  'a hot water cylinder',
  'a heat pump',

  // Insulation
  'wall insulation',
  'loft insulation',
  'cavity wall',
  'solid wall',

  // Windows and doors
  'a window',
  'a double glazed window',
  'a single glazed window',
  'a door',
  'a front door',

  // General
  'a person',
  'a room',
  'a ceiling',
  'a wall',
  'a floor',
];

async function generateEmbeddings() {
  console.log('Loading tokenizer and text model...');

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
    dtype: 'q8',
  });

  console.log(`Generating embeddings for ${ALL_LABELS.length} labels...`);

  const embeddings: Record<string, number[]> = {};

  for (const label of ALL_LABELS) {
    // CLIP uses "a photo of {label}" template
    const text = `a photo of ${label}`;
    const inputs = await tokenizer(text, { padding: true, truncation: true });
    const output = await textModel(inputs);

    // Get the text embedding and convert to array
    const embedding = Array.from(output.text_embeds.data as Float32Array);

    // Normalize the embedding (CLIP embeddings should be normalized for cosine similarity)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / norm);

    embeddings[label] = normalizedEmbedding;
    console.log(`  ✓ ${label}`);
  }

  // Output as JSON
  const output = {
    modelId: MODEL_ID,
    generatedAt: new Date().toISOString(),
    embeddingDimension: Object.values(embeddings)[0].length,
    labels: embeddings,
  };

  // Write directly to file
  const fs = await import('fs');
  const path = await import('path');

  const outputPath = path.join(process.cwd(), 'src/data/labelEmbeddings.ts');

  const fileContent = `/**
 * Pre-computed text embeddings for classification labels.
 *
 * Generated using: npx tsx scripts/generate-embeddings.ts
 * Generated at: ${output.generatedAt}
 *
 * This allows us to load only the vision model (~88MB) at runtime
 * instead of both vision + text models (~153MB).
 *
 * IMPORTANT: Re-generate this file if you add new labels!
 */

export const LABEL_EMBEDDINGS = ${JSON.stringify(output, null, 2)} as const;

export type LabelKey = keyof typeof LABEL_EMBEDDINGS.labels;

/**
 * Get embeddings for a subset of labels.
 * Labels without embeddings will be filtered out with a warning.
 */
export function getEmbeddingsForLabels(labels: string[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const label of labels) {
    if (LABEL_EMBEDDINGS.labels[label]) {
      result[label] = LABEL_EMBEDDINGS.labels[label];
    } else {
      console.warn(\`No pre-computed embedding for label: "\${label}"\`);
    }
  }
  return result;
}
`;

  fs.writeFileSync(outputPath, fileContent);
  console.log(`\n✓ Written to ${outputPath}`);
}

generateEmbeddings().catch(console.error);
