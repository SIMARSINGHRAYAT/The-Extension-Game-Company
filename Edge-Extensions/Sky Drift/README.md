# Sky Drift Chrome Extension

Sky Drift is a complete Manifest V3 Chrome extension. It runs an original Flappy-style arcade game directly from the browser toolbar.

## Folder Structure

- `manifest.json`: Chrome extension manifest.
- `popup.html`: Popup markup.
- `popup.css`: Popup styling.
- `popup.js`: Canvas game engine, controls, scoring, and local best score storage.
- `icons/icon128.png`: Extension icon.

## Load Locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `sky-drift-extension` folder.
5. Pin Sky Drift from the extensions menu and open it from the toolbar.

## Package For Distribution

1. Zip the contents of `sky-drift-extension`.
2. Upload the zip to the Chrome Web Store Developer Dashboard.

No external services, network permissions, or build tools are required for the extension folder.