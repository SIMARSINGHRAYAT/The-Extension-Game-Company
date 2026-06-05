Extension build & packaging

1) Build the extension into a single folder:

```bash
npm install
npm run build:extension
```

Output folder: `dist/extension` — all files (index.html, manifest.json, icons, assets) are flattened to this folder root.

2) Pack into a ZIP (Windows PowerShell):

```bash
npm run pack:extension
```

This produces `dist/neon-tic-tac-toe-extension.zip` for upload to the Chrome Web Store or for manual distribution.

3) Test locally in Chrome/Edge:
- Open `chrome://extensions`
- Enable Developer mode
- Load unpacked and select `dist/extension`

Notes:
- Icons are in `public/` (`icon16.svg`, `icon48.svg`, `icon128.svg`).
- The build uses `vite-plugin-singlefile` and a helper script `scripts/flatten.js` to keep files at the root of the output folder as requested.
