#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(process.cwd(), 'public');
const sizes = [16, 48, 128];
const svgName = 'icon128.svg';
const svgPath = path.join(publicDir, svgName);
if (!fs.existsSync(svgPath)) {
  console.error('SVG source not found at', svgPath);
  process.exit(1);
}

(async () => {
  const svgBuffer = fs.readFileSync(svgPath);
  for (const s of sizes) {
    const out = path.join(publicDir, `icon${s}.png`);
    try {
      await sharp(svgBuffer).resize(s, s).png().toFile(out);
      console.log('Wrote', out);
    } catch (err) {
      console.error('Failed to write', out, err);
      process.exit(1);
    }
  }
  console.log('PNG icons generated in', publicDir);
})();
