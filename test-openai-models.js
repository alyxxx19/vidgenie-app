const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testModels() {
  console.log('=== Testing OpenAI Image Generation Models ===\n');
  
  // Test models that might work for images
  const modelsToTest = [
    'dall-e-3',
    'dall-e-2', 
    'gpt-image-1',
    'gpt-4-vision-preview',
    'gpt-4o'
  ];
  
  for (const model of modelsToTest) {
    console.log(`Testing model: ${model}`);
    try {
      const response = await openai.images.generate({
        model: model,
        prompt: "A test image",
        n: 1,
        size: "1024x1024",
      });
      console.log(`✅ ${model} works for image generation!`);
    } catch (error) {
      console.log(`❌ ${model}: ${error.message.slice(0, 100)}`);
    }
    console.log('---');
  }
}

testModels().catch(console.error);