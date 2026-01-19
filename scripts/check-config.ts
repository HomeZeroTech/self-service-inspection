
import { SiglipModel } from '@huggingface/transformers';

async function checkConfig() {
  const modelId = 'onnx-community/siglip2-base-patch16-224-ONNX';
  console.log('Loading model config for:', modelId);
  try {
    const model = await SiglipModel.from_pretrained(modelId, {
      dtype: 'q8',
      device: 'cpu',
    });
    console.log('Model instance keys:', Object.keys(model));
    console.log('Logit Scale property:', model.logit_scale);
    console.log('Logit Bias property:', model.logit_bias);
  } catch (e) {
    console.error('Error loading model:', e);
  }
}

checkConfig();
