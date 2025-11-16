# Chrome Code

A Chrome extension that brings AI coding assistance directly into Chrome DevTools for CodePen. Chat with an AI agent to read and modify your CodePen code in real-time.

## Features

- Chat interface integrated into Chrome DevTools
- Read all code from CodePen editors (HTML, CSS, JavaScript)
- Modify code directly through natural language commands
- Multiple AI providers supported (currently Claude and Gemini)
- Dark theme matching DevTools aesthetic
- Real-time code synchronization

## Prerequisites

- Chrome or Chromium-based browser
- API key for your chosen provider:
  - Claude: [Get key from Anthropic](https://console.anthropic.com/)
  - Gemini: [Get key from Google AI Studio](https://aistudio.google.com/apikey)
- A CodePen account and pens to work with

## Installation

### 1. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked"
4. Select the `chromecode` directory (this folder)
5. The extension should now appear in your extensions list

### 2. Configure Your API Key

1. Navigate to any CodePen page (e.g., https://codepen.io/pen/)
2. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
3. Click on the "AI Code" tab in DevTools
4. Select your AI provider from the dropdown (Claude or Gemini)
5. Click the settings icon (⚙️)
6. Enter your API key for the selected provider
7. Click "Save"

## Usage

### Basic Usage

1. Open a CodePen page with some code
2. Open Chrome DevTools and switch to the "AI Code" tab
3. The status should show "Connected to CodePen"
4. Select your preferred AI provider (Claude or Gemini)
5. Start chatting with the agent about your code!

### Code Update Syntax

When the agent wants to update code, it uses special markers with SEARCH/REPLACE blocks:

```
[UPDATE_HTML]
<<<SEARCH>>>
<div>Old HTML code here</div>
<<<REPLACE>>>
<div>New HTML code here</div>
[/UPDATE_HTML]

[UPDATE_CSS]
<<<SEARCH>>>
background: red;
<<<REPLACE>>>
background: blue;
[/UPDATE_CSS]

[UPDATE_JS]
<<<SEARCH>>>
console.log('old');
<<<REPLACE>>>
console.log('new');
[/UPDATE_JS]
```

The extension will automatically detect these markers, find the SEARCH text in the current code, and replace it with the REPLACE text. Changed lines are highlighted briefly in the CodePen editor.

### Keyboard Shortcuts

- **Ctrl+Enter** (or Cmd+Enter on Mac): Send message
- Type normally in the input box and click "Send"

## How It Works

### Architecture

```
┌─────────────────┐
│  DevTools Panel │  (panel.html, panel.js)
│  (Chat UI)      │
└────────┬────────┘
         │
         ├─── Communicates via Chrome Runtime ───┐
         │                                        │
┌────────▼────────┐                    ┌────────▼────────┐
│  Background     │◄──────────────────►│ Content Script  │
│  Service Worker │                    │  (content.js)   │
│ (background.js) │                    │  Isolated World │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                │ window.postMessage
                                                ▼
                                       ┌─────────────────┐
                                       │  Inject Script  │
                                       │   (inject.js)   │
                                       │   Main World    │
                                       └────────┬────────┘
                                                │
                                                │ Accesses CodeMirror
                                                ▼
                                       ┌─────────────────┐
                                       │ CodePen Editors │
                                       │  (HTML/CSS/JS)  │
                                       └─────────────────┘
```

### Components

1. **DevTools Panel** ([panel.html](panel.html), [panel.js](panel.js), [panel.css](panel.css))
   - Chat interface
   - API key management
   - Conversation history
   - AI provider selection and integration

2. **AI Agents** ([js/ClaudeAgent.js](js/ClaudeAgent.js), [js/GeminiAgent.js](js/GeminiAgent.js))
   - Abstracted agent interface
   - Provider-specific API communication
   - Swappable implementations

3. **Background Service Worker** ([background.js](background.js))
   - Message routing between DevTools and content script
   - Connection management
   - Calls AI APIs (to avoid CORS issues)

4. **Content Script** ([content.js](content.js))
   - Runs on CodePen pages in isolated world
   - Bridges communication between panel and inject script
   - Uses window.postMessage to communicate with main world

5. **Inject Script** ([inject.js](inject.js))
   - Runs in main world (same context as CodePen)
   - Accesses CodeMirror editor instances directly
   - Reads and modifies code in the editors
   - Highlights changed lines with animations

6. **DevTools Entry** ([devtools.html](devtools.html), [devtools.js](devtools.js))
   - Creates the DevTools panel

### CodePen Integration

The extension accesses CodePen's editors through the CodeMirror API:
- inject.js runs in the main world to access CodeMirror instances
- Detects CodeMirror instances via `.box-html`, `.box-css`, `.box-js` selectors
- Reads code using `editor.getValue()`
- Updates code using `editor.setValue()`
- Highlights changed lines with CSS animations
- Scrolls to first changed line for visibility

## Development

### File Structure

```
chromecode/
├── manifest.json          # Extension configuration
├── devtools.html          # DevTools entry point
├── devtools.js            # DevTools panel creator
├── panel.html             # Chat UI
├── panel.css              # Chat UI styles
├── panel.js               # Chat logic & agent integration
├── background.js          # Background service worker
├── content.js             # Content script (isolated world)
├── inject.js              # Inject script (main world)
├── js/                    # AI agent implementations
│   ├── ClaudeAgent.js     # Claude API integration
│   └── GeminiAgent.js     # Gemini API integration
├── icons/                 # Extension icons
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Making Changes

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the CodePen page
5. Reopen DevTools

### Debugging

- **DevTools Panel**: Right-click on the panel and select "Inspect"
- **Background Script**: Go to `chrome://extensions/` and click "Inspect views: background page"
- **Content Script**: Use the regular DevTools console on the CodePen page

## Troubleshooting

### "Not connected" status

- Make sure you're on a CodePen page
- Try refreshing the CodePen page
- Check the console for errors (right-click panel → Inspect)

### Code not updating

- Verify the CodePen editors are visible and loaded
- Check that you're using the correct editor names (html, css, js)
- Look for error messages in the chat

### API errors

- Verify your API key is correct
- Check your API key has available credits
- Ensure you have internet connectivity
- Check the Anthropic API status

### Extension not loading

- Check for errors on `chrome://extensions/`
- Try removing and re-adding the extension
- Ensure all required files are present in the directory

## API Costs

API costs depend on your chosen provider:

**Claude** (Sonnet 4.5):
- See [Anthropic's pricing](https://www.anthropic.com/pricing)

**Gemini** (2.5 Flash):
- See [Google AI pricing](https://ai.google.dev/pricing)

Each message sends the current code state plus conversation history. To minimize costs:
- Keep conversations focused
- Start a new conversation for different tasks
- Avoid very long code examples

## Privacy & Security

- Your API keys are stored locally in Chrome's storage (separate for each provider)
- Code is sent to your chosen provider's API for processing
- No code or conversations are stored by this extension
- All communication happens directly between your browser and the provider's API

## Limitations

- Only works on CodePen pages
- Requires active internet connection
- Requires valid API key for chosen provider
- Code changes are applied to all three editors independently
- Cannot handle multiple CodePen tabs simultaneously (uses inspected window)

## Future Improvements

Potential features for future versions:
- Support for other code editors (JSFiddle, CodeSandbox, etc.)
- Additional AI providers (OpenAI, etc.)
- Conversation export/import
- Code history and undo
- Syntax highlighting in chat
- Partial code updates (instead of full replacement)
- Model selection within providers
- Streaming responses

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to use and modify as needed.

## Credits

- AI providers: [Claude](https://www.anthropic.com/claude) and [Gemini](https://ai.google.dev/)
- Designed for [CodePen](https://codepen.io/)
- Inspired by [Claude Code](https://docs.claude.com/claude-code)

---

Made with ❤️ for CodePen creators
