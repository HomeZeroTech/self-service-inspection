/**
 * Script to pre-compute text embeddings for classification labels.
 * Run with: npx tsx scripts/generate-embeddings.ts
 *
 * This generates embeddings once, so at runtime we only need the vision model (~95MB)
 * instead of both vision + text models (~378MB).
 */

import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';

// MobileClip S2 - optimized for mobile devices (~37MB vs ~95MB)
const MODEL_ID = 'Xenova/mobileclip_s2';
const TEXT_MODEL_ID = MODEL_ID;

// All possible labels for home inspection
// Add all labels that will be used across all inspection steps
// Includes both target objects AND negative prompts for better discrimination
const ALL_LABELS = [
  // === STEP 1: Radiator ===
  // Target
  'a white metal radiator',
  // Additional radiator variants
  'a radiator',
  'a wall-mounted radiator',
  'a floor-mounted radiator',
  'a towel radiator',
  'underfloor heating',
  // Negatives for radiator detection
  'a door',
  'a thermostat',
  'a wall',
  'a floor',
  'a waterfall',
  'a beach',
  'a jungle',
  'a window',
  'a curtain',
  'an air conditioning unit',

  // === STEP 2: Smart Energy Meter ===
  // Target
  'a smart energy meter with digital display',
  // Additional meter variants
  'an electricity meter',
  'an electricity meter on a wall',
  'a smart meter',
  'a gas meter',
  'a water meter',
  'a meter box',
  'an electrical panel',
  'a fuse box',
  'a circuit breaker panel',
  // Negatives for meter detection
  'pipes',
  'wires',
  'folding stairs',

  // === STEP 3: Central Heating Boiler ===
  // Target
  'a central heating boiler unit',
  // Additional boiler variants
  'a boiler',
  'a gas boiler unit',
  'a combi boiler',
  'a water heater',
  'a hot water cylinder',
  'a heat pump',
  // Negatives for boiler detection
  'an electric boiler',
  'a washing machine',
  'a tumble dryer',

  // === General labels ===
  // Insulation
  'wall insulation',
  'loft insulation',
  'cavity wall',
  'solid wall',

  // Windows and doors
  'a double glazed window',
  'a single glazed window',
  'a front door',

  // General (useful as negatives)
  'a person',
  'a room',
  'a ceiling',
];

async function generateEmbeddings() {
  console.log('Loading tokenizer and text model for:', MODEL_ID);

  const tokenizer = await AutoTokenizer.from_pretrained(TEXT_MODEL_ID);
  const textModel = await CLIPTextModelWithProjection.from_pretrained(TEXT_MODEL_ID, {
    dtype: 'q8',
  });

  console.log(`Generating embeddings for ${ALL_LABELS.length} labels...`);

  const embeddings: Record<string, number[]> = {};

  for (const label of ALL_LABELS) {
    // CLIP uses lowercase text and max_length=77
    const text = label.toLowerCase();
    const inputs = await tokenizer(text, { padding: 'max_length', max_length: 77, truncation: true });
    
    const output = await textModel(inputs);

    // Get the text embedding and convert to array
    const embedding = Array.from(output.text_embeds.data as Float32Array);

    // Normalize the embedding for cosine similarity
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map((val) => val / norm);

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
 * This allows us to load only the vision model (~95MB) at runtime
 * instead of both vision + text models (~378MB).
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
  const allLabels = LABEL_EMBEDDINGS.labels as Record<string, readonly number[]>;
  for (const label of labels) {
    if (label in allLabels) {
      result[label] = [...allLabels[label]];
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

generateEmbeddings().catch((err) => {
  console.error('FULL ERROR:', err);
  process.exit(1);
});
