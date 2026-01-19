
import { SiglipModel } from '@huggingface/transformers';

async function debugModel() {
  const modelId = 'onnx-community/siglip2-base-patch16-224-ONNX';
  console.log('Loading model...');
  try {
    const model = await SiglipModel.from_pretrained(modelId, {
      dtype: 'q8',
    });
    console.log('Model instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
    console.log('Model instance own keys:', Object.keys(model));
  } catch (e) {
    console.error('Error:', e);
  }
}

debugModel();
