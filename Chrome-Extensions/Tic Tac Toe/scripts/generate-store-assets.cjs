#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'dist', 'extension');
const storeDir = path.join(publicDir, 'store');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
ensureDir(storeDir);

async function makeIcon128() {
  const svgPath = path.join(publicDir, 'icon128.svg');
  const pngPath = path.join(storeDir, 'icon_128.png');
  if (fs.existsSync(svgPath)) {
    await sharp(svgPath)
      .resize(128, 128)
      .png({ compressionLevel: 9 })
      .toFile(pngPath);
    console.log('Wrote', pngPath);
  } else {
    // create a simple placeholder
    const svg = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" font-size="20" dominant-baseline="middle" text-anchor="middle" fill="#333">ICON</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log('Wrote placeholder', pngPath);
  }
}

async function makeScreenshot(width, height, name) {
  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <g>
      <text x="50%" y="45%" font-size="48" dominant-baseline="middle" text-anchor="middle" fill="#222">Screenshot Placeholder</text>
      <text x="50%" y="60%" font-size="28" dominant-baseline="middle" text-anchor="middle" fill="#666">${width} × ${height}</text>
    </g>
  </svg>`;
  const outJpg = path.join(storeDir, name);
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(outJpg);
  console.log('Wrote', outJpg);
}

async function copyToDistIfExists(fileName) {
  const src = path.join(storeDir, fileName);
  const dest = path.join(outDir, fileName);
  if (fs.existsSync(src) && fs.existsSync(outDir)) {
    fs.copyFileSync(src, dest);
    console.log('Copied to dist:', dest);
  }
}

(async () => {
  try {
    await makeIcon128();
    await makeScreenshot(1280, 800, 'screenshot_1280x800.jpg');
    await makeScreenshot(640, 400, 'screenshot_640x400.jpg');

    // copy into dist/extension if build exists
    ['icon_128.png','screenshot_1280x800.jpg','screenshot_640x400.jpg'].forEach(copyToDistIfExists);

    console.log('Store assets generated in', storeDir);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
