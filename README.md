# YouTube Picture-in-Picture Extension

A Chrome extension that adds enhanced Picture-in-Picture functionality to YouTube videos, allowing you to watch videos in a floating window while browsing other content.

## Features

- **One-click PiP activation**: Button added directly to YouTube's video controls
- **Keyboard shortcut**: Press `P` while watching any YouTube video
- **Right-click context menu**: Access PiP from the video context menu
- **Smart detection**: Automatically works on all YouTube video pages
- **Seamless integration**: Matches YouTube's native design
- **Cross-page viewing**: Watch videos while browsing other tabs or applications

## Installation

### Method 1: Development Installation

1. **Clone or download this repository**
   ```bash
   git clone <your-repo-url>
   cd pipcorn
   ```

2. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

3. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the project folder (`pipcorn`)

### Method 2: Production Build

1. **Build the extension**
   ```bash
   npm run build
   ```

2. **Package for distribution**
   - The `dist` folder contains the compiled JavaScript files
   - Use the entire project folder as your extension package

## Usage

### Activating Picture-in-Picture

1. **Using the PiP Button**
   - Navigate to any YouTube video
   - Look for the PiP button in the video controls (next to fullscreen)
   - Click the button to enter Picture-in-Picture mode

2. **Using Keyboard Shortcut**
   - While watching a YouTube video, press the `P` key
   - This works from anywhere on the YouTube page

3. **Using Right-Click Menu**
   - Right-click on any YouTube video
   - Select "Picture in Picture" from the context menu

4. **Using Extension Popup**
   - Click the extension icon in Chrome's toolbar
   - Click "Enable Picture-in-Picture" button

### Exiting Picture-in-Picture

- Click the PiP button again (now shows as active)
- Press `P` again while on YouTube
- Use the close button on the floating video window
- Click "Exit Picture-in-Picture" in the extension popup

## Browser Compatibility

- **Chrome**: Version 70+ (full support)
- **Edge**: Version 79+ (full support)
- **Safari**: Limited support (requires Safari 13.1+)
- **Firefox**: Not supported (different Picture-in-Picture API)

## Technical Details

### Project Structure

```
pipcorn/
├── src/
│   ├── content.ts       # Content script for YouTube integration
│   ├── background.ts    # Service worker for extension management
│   └── popup.ts         # Popup interface controller
├── styles.css           # YouTube page styles
├── popup.css           # Popup interface styles
├── popup.html          # Popup interface HTML
├── manifest.json       # Extension manifest
├── package.json        # Node.js dependencies
└── tsconfig.json       # TypeScript configuration
```

### Key Technologies

- **TypeScript**: For type-safe development
- **Chrome Extension Manifest V3**: Latest extension platform
- **Picture-in-Picture API**: Native browser PiP functionality
- **YouTube Integration**: Custom controls injection

### Development Scripts

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Watch for changes during development
npm run watch

# Clean build files
npm run clean
```

## How It Works

1. **Content Script Injection**: The extension injects a content script into YouTube pages that:
   - Detects video elements
   - Adds a custom PiP button to the video controls
   - Listens for keyboard shortcuts and user interactions

2. **Picture-in-Picture API**: Uses the native browser Picture-in-Picture API:
   - `video.requestPictureInPicture()` to enter PiP mode
   - `document.exitPictureInPicture()` to exit PiP mode
   - Event listeners for `enterpictureinpicture` and `leavepictureinpicture`

3. **YouTube Integration**: 
   - Dynamically finds YouTube's video controls container
   - Injects the PiP button with matching styles
   - Handles YouTube's single-page application navigation

4. **Background Service**: Manages:
   - Context menu creation
   - Cross-tab communication
   - Extension state management

## Troubleshooting

### PiP Button Not Appearing
- Refresh the YouTube page
- Make sure you're on a video page (not the homepage)
- Check that the extension is enabled in `chrome://extensions/`

### Picture-in-Picture Not Working
- Ensure your browser supports Picture-in-Picture (Chrome 70+)
- Check that the video is loaded and playing
- Try refreshing the page and waiting for the video to load

### Keyboard Shortcut Not Working
- Make sure you're not typing in a text field
- The shortcut only works on YouTube video pages
- Try clicking on the video area first to ensure focus

## Privacy & Permissions

This extension requires minimal permissions:
- **activeTab**: To interact with the current YouTube tab
- **storage**: To save user preferences (if implemented)
- **host_permissions**: Only for YouTube domains (*.youtube.com)

The extension:
- ✅ Only runs on YouTube pages
- ✅ Does not collect or transmit any personal data
- ✅ Does not modify video content or inject ads
- ✅ Works entirely locally in your browser

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have feature requests:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Provide details about your browser version and the specific problem

---

**Note**: This extension enhances YouTube's existing functionality and respects all YouTube terms of service. It does not download, store, or redistribute any video content.
