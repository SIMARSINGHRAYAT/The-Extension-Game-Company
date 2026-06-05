#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'dist', 'extension');
const publicDir = path.join(root, 'public');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
}

if (!fs.existsSync(outDir)) {
  console.error('Build output not found at', outDir);
  process.exit(1);
}

// Copy manifest and icons from public to outDir
ensureDir(outDir);
copyIfExists(path.join(publicDir, 'manifest.json'), path.join(outDir, 'manifest.json'));
['icon16.svg','icon48.svg','icon128.svg'].forEach(name => {
  copyIfExists(path.join(publicDir, name), path.join(outDir, name));
});

// Flatten nested asset folders into outDir root and update references
function walkAndMove(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkAndMove(full);
      try { fs.rmdirSync(full); } catch (err) {}
    } else if (e.isFile()) {
      const target = path.join(outDir, path.basename(e.name));
      if (full !== target) {
        try { fs.renameSync(full, target); } catch (err) { /* ignore */ }
      }
    }
  }
}

const subdirs = fs.readdirSync(outDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(outDir, d.name));
subdirs.forEach(d => walkAndMove(d));

['index.html','manifest.json'].forEach(fn => {
  const p = path.join(outDir, fn);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/\/(assets|assets\/|static\/)/g, '/');
  s = s.replace(/assets\//g, '');
  s = s.replace(/([^:])\/\//g, '$1/');
  // remove leading slashes from src/href so extension pages load assets relatively
  s = s.replace(/src="\//g, 'src="');
  s = s.replace(/href="\//g, 'href="');
  fs.writeFileSync(p, s, 'utf8');
});

console.log('Flatten complete — extension ready in', outDir);
