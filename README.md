# Chrome Extension

A new Chrome extension built with Manifest V3.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this directory

## Development

The extension consists of the following files:

- `manifest.json`: Extension configuration and permissions
- `popup.html`: The popup UI that appears when clicking the extension icon
- `popup.js`: JavaScript code for the popup functionality
- `icons/`: Directory containing extension icons (you'll need to add these)

## Adding Icons

Before using the extension, you'll need to add icon files in the following sizes:
- 16x16 pixels: `icons/icon16.png`
- 48x48 pixels: `icons/icon48.png`
- 128x128 pixels: `icons/icon128.png`

## Customization

1. Modify `popup.html` to change the extension's UI
2. Edit `popup.js` to add your custom functionality
3. Update `manifest.json` to add permissions or change extension metadata 