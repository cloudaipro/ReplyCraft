# ReplyCraft

AI-powered Chrome extension for generating contextual replies on social media.

## Features

- Generate AI-powered reply suggestions for Reddit, Twitter/X, and Facebook
- Multiple tone options (friendly, professional, witty, etc.)
- Custom tone support
- Draft rewriting with keyboard shortcuts
- Response caching to reduce API calls

## Installation

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` directory

### Production Build

```bash
npm run build
```

## Configuration

1. Click the ReplyCraft extension icon
2. Go to Settings
3. Enter your OpenAI API key (get one from [OpenAI](https://platform.openai.com/api-keys))

## Usage

1. Navigate to a supported platform (Reddit, Twitter/X, or Facebook)
2. Open a post/thread you want to reply to
3. Click the ReplyCraft extension icon
4. Select your preferred tone
5. Click "Analyze Thread" to generate reply suggestions
6. Click "Insert" to add the suggestion to the reply box, or "Copy" to copy to clipboard

### Keyboard Shortcut

- **Ctrl+Shift+Y** (Windows/Linux) or **Cmd+Shift+Y** (Mac): Rewrite selected draft text

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run E2E tests |
| `npm run typecheck` | Type checking |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier formatting |

## Tech Stack

- TypeScript 5.x with strict mode
- Chrome Extension Manifest V3
- OpenAI API
- Vite with CRXJS plugin
- Vitest for unit testing
- Playwright for E2E testing

## Project Structure

```
src/
├── background/           # Service worker (AI service, cache, message handler)
├── content/              # Content scripts (thread extraction, text insertion)
├── popup/                # Extension popup UI
├── platform-adapters/    # Reddit, Twitter/X, Facebook DOM adapters
├── shared/               # Types, constants, storage, prompts
└── manifest.json         # Chrome extension manifest

tests/
├── unit/                 # Unit tests (Vitest)
├── integration/          # Integration tests
└── e2e/                  # E2E tests (Playwright)
```

## License

MIT
