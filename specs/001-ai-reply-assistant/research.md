# Research: AI Reply Assistant Chrome Extension

**Feature**: 001-ai-reply-assistant
**Date**: 2025-11-27
**Status**: Complete

## Technology Decisions

### 1. Chrome Extension Architecture (Manifest V3)

**Decision**: Use Manifest V3 with service worker for background processing

**Rationale**:
- Manifest V2 is deprecated; Chrome Web Store requires V3 for new extensions
- Service workers provide better memory management than persistent background pages
- Aligns with Chrome's security model and CSP requirements

**Alternatives Considered**:
- Manifest V2: Rejected - deprecated, no longer accepted in Chrome Web Store
- Web app with bookmarklet: Rejected - limited DOM access, poor UX

**Implementation Notes**:
- Service worker has no DOM access; use message passing to content scripts
- Service worker may be terminated after ~30 seconds of inactivity; design for statelessness
- Use chrome.alarms for periodic tasks instead of setInterval

### 2. TypeScript Configuration

**Decision**: TypeScript 5.x with strict mode and Chrome types

**Rationale**:
- Constitution mandates TypeScript with strict mode
- Type safety reduces runtime errors in extension context
- Chrome extension types available via @anthropic/anthropic-types or @anthropic/chrome-types npm packages

**Alternatives Considered**:
- JavaScript: Rejected - constitution requires TypeScript
- TypeScript without strict: Rejected - constitution requires strict mode

**Key Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["chrome"]
  }
}
```

### 3. Build System

**Decision**: Vite with CRXJS plugin for Chrome extension bundling

**Rationale**:
- Fast HMR for development
- CRXJS handles manifest.json generation and hot reload for extensions
- Native TypeScript support
- Tree-shaking reduces bundle size

**Alternatives Considered**:
- Webpack: Viable but slower, more configuration needed
- Rollup: Good but lacks extension-specific plugins
- esbuild: Fast but requires more manual extension handling

### 4. AI Provider Integration

**Decision**: OpenAI API as primary provider with adapter pattern for future providers

**Rationale**:
- GPT-4 provides high-quality contextual responses
- Well-documented API with TypeScript SDK
- Adapter pattern allows future addition of Anthropic Claude, local models

**Alternatives Considered**:
- Claude API only: Viable, but OpenAI has wider adoption
- Multiple providers from start: Over-engineering for v1.0
- Local LLM: Performance/quality tradeoffs not suitable for v1.0

**Implementation Notes**:
- Use openai npm package for API calls
- Implement AIProvider interface for future extensibility
- Handle API errors: rate limits (429), auth errors (401), timeout

### 5. Testing Strategy

**Decision**: Vitest for unit tests, Playwright for E2E extension testing

**Rationale**:
- Vitest is fast, Vite-native, excellent TypeScript support
- Playwright has first-class Chrome extension testing support
- Both tools have active maintenance and good documentation

**Alternatives Considered**:
- Jest: Slower, requires more configuration for ESM/TypeScript
- Puppeteer: Less ergonomic API than Playwright for testing

**Test Coverage Priorities**:
1. Platform adapters (DOM extraction logic)
2. Cache service (TTL, storage limits)
3. AI service (prompt construction, error handling)
4. Message passing (content script ↔ service worker)

### 6. Platform DOM Extraction Strategy

**Decision**: Platform-specific adapters with CSS selector-based extraction

**Rationale**:
- Each platform has unique DOM structure
- CSS selectors are fast and well-supported
- Adapter pattern isolates platform-specific code

**Platform Research**:

#### Reddit (new.reddit.com and old.reddit.com)
- Post title: `h1[slot="title"]` (new), `.title a.title` (old)
- Post body: `div[slot="text-body"]` (new), `.usertext-body` (old)
- Comments: `shreddit-comment` elements (new), `.comment .usertext-body` (old)
- Reply box: `div[contenteditable="true"]` or `textarea`

#### Twitter/X
- Tweet content: `article[data-testid="tweet"] div[data-testid="tweetText"]`
- Thread replies: Multiple `article` elements in conversation view
- Reply box: `div[data-testid="tweetTextarea_0"]` (contenteditable)

#### Facebook
- Post content: `div[data-ad-preview="message"]` or `div[data-ad-comet-preview="message"]`
- Comments: Nested `div` structures with comment text
- Reply box: `div[contenteditable="true"][role="textbox"]`

**Risk Mitigation**:
- Store selectors in configuration for easy updates
- Implement fallback selectors for common patterns
- Add selector validation in tests with HTML snapshots

### 7. Caching Implementation

**Decision**: chrome.storage.local with URL+tone hash keys and 24-hour TTL

**Rationale**:
- chrome.storage.local provides 10MB quota (sufficient for text cache)
- Sync across windows without additional setup
- Built-in persistence across browser restarts

**Alternatives Considered**:
- IndexedDB: More complex API, overkill for simple cache
- localStorage: Not available in service workers
- In-memory only: Lost on service worker termination

**Cache Key Structure**:
```typescript
interface CacheKey {
  url: string;      // Thread URL (normalized)
  tone: string;     // Selected tone
  hash: string;     // MD5 of url+tone for storage key
}
```

**Storage Limits Handling**:
- Monitor storage usage via chrome.storage.local.getBytesInUse()
- When approaching limit (8MB), prune oldest 20% of entries
- Individual entry size capped at 100KB

### 8. Hotkey Implementation

**Decision**: Chrome commands API with user-configurable shortcuts

**Rationale**:
- Native Chrome integration via chrome://extensions/shortcuts
- Works even when popup is closed
- Respects user's custom keybindings

**Default Binding**: `Ctrl+Shift+R` (Windows/Linux), `Command+Shift+R` (Mac)

**Implementation Notes**:
- Register command in manifest.json
- Listen via chrome.commands.onCommand in service worker
- Debounce with 500ms delay to prevent accidental double-triggers

### 9. Content Security Policy

**Decision**: Strict CSP compliant with Manifest V3 requirements

**Rationale**:
- Manifest V3 enforces strict CSP
- No inline scripts, no eval(), no remote code
- All scripts must be bundled in extension package

**CSP Configuration**:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 10. UI Framework Decision

**Decision**: Vanilla TypeScript with minimal abstraction for popup UI

**Rationale**:
- Popup is simple (single page, few components)
- No framework reduces bundle size
- Direct DOM manipulation is sufficient for this scope
- Easier to maintain long-term without framework churn

**Alternatives Considered**:
- React: Overhead not justified for simple popup
- Preact: Better, but still adds complexity
- Svelte: Good option, but team familiarity with vanilla is higher

**UI Component Pattern**:
```typescript
// Simple component pattern
class ToneSelector {
  private element: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.element = this.render();
    container.appendChild(this.element);
  }

  private render(): HTMLSelectElement { ... }
  public getValue(): string { ... }
  public setValue(tone: string): void { ... }
}
```

## Unresolved Items

None. All technical decisions have been made for v1.0 scope.

## References

- [Chrome Extension Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Playwright Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Vitest Documentation](https://vitest.dev/)
