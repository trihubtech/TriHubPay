import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processImage(inputPath, outputPath, isDarkVersion = false) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4 (RGBA)

  // Scan pixels and convert white background to transparent
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is near-white (background)
    const brightness = (r + g + b) / 3;
    const isWhiteBg = brightness > 235 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;

    if (isWhiteBg) {
      data[i + 3] = 0; // Alpha = 0 (completely transparent)
    } else if (isDarkVersion) {
      // For dark mode: brighten deep blues so they glow on dark backgrounds
      if (b > r + 30 && brightness < 140) {
        data[i] = Math.min(255, Math.floor(r * 1.5 + 40));     // boost red slightly for softer blue
        data[i + 1] = Math.min(255, Math.floor(g * 1.6 + 60)); // boost green towards cyan
        data[i + 2] = Math.min(255, Math.floor(b * 1.2 + 80)); // boost blue
      }
    }
  }

  await sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

async function run() {
  const baseDir = path.resolve(__dirname, '../public');

  // Concept 1
  await processImage(
    path.join(baseDir, 'trihubpay_concept_1_emblem.jpg'),
    path.join(baseDir, 'trihubpay_concept_1_transparent.png'),
    false
  );
  await processImage(
    path.join(baseDir, 'trihubpay_concept_1_emblem.jpg'),
    path.join(baseDir, 'trihubpay_concept_1_dark.png'),
    true
  );

  // Concept 3
  await processImage(
    path.join(baseDir, 'trihubpay_concept_3_brand_seal.jpg'),
    path.join(baseDir, 'trihubpay_concept_3_transparent.png'),
    false
  );
  await processImage(
    path.join(baseDir, 'trihubpay_concept_3_brand_seal.jpg'),
    path.join(baseDir, 'trihubpay_concept_3_dark.png'),
    true
  );

  console.log('Done processing transparent assets!');
}

run().catch(console.error);
