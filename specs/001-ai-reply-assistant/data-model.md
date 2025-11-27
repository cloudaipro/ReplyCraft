# Data Model: AI Reply Assistant Chrome Extension

**Feature**: 001-ai-reply-assistant
**Date**: 2025-11-27

## Entity Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   ThreadContext     │     │   UserPreferences   │
├─────────────────────┤     ├─────────────────────┤
│ platform            │     │ selectedTone        │
│ url                 │     │ customToneText      │
│ postTitle           │     │ apiKey (encrypted)  │
│ postBody            │     │ cacheTTLHours       │
│ comments[]          │     │ enabledPlatforms[]  │
│ extractedAt         │     └─────────────────────┘
└─────────────────────┘              │
         │                           │
         ▼                           │
┌─────────────────────┐              │
│   CacheEntry        │◄─────────────┘
├─────────────────────┤
│ cacheKey            │
│ threadUrl           │
│ tone                │
│ suggestions[]       │
│ threadSummary       │
│ createdAt           │
│ expiresAt           │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   AISuggestion      │
├─────────────────────┤
│ id                  │
│ text                │
│ tone                │
│ generatedAt         │
└─────────────────────┘
```

## Entity Definitions

### ThreadContext

Represents extracted content from a social media thread.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| platform | `'reddit' \| 'twitter' \| 'facebook'` | Source platform identifier | Required, enum |
| url | `string` | Canonical thread URL | Required, valid URL |
| postTitle | `string` | Title of the post (may be empty for Twitter) | Max 500 chars |
| postBody | `string` | Main post content | Max 10,000 chars |
| comments | `Comment[]` | Array of thread comments | Max 50 comments |
| extractedAt | `number` | Unix timestamp of extraction | Required |

**Comment Sub-entity**:

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique comment identifier |
| author | `string` | Comment author username |
| text | `string` | Comment content (max 2,000 chars) |
| parentId | `string \| null` | Parent comment ID for nesting |
| depth | `number` | Nesting level (0 = top-level) |

**Validation Rules**:
- URL must match supported platform patterns
- Total extracted text (post + comments) capped at 15,000 chars
- Deeper comments (depth > 3) may be truncated for context window

### UserPreferences

Persisted user settings stored in chrome.storage.sync.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| selectedTone | `TonePreset \| 'custom'` | Active tone setting | `'friendly'` |
| customToneText | `string \| null` | User-defined tone description | `null` |
| apiKey | `string` | OpenAI API key (encrypted in storage) | `''` |
| cacheTTLHours | `number` | Cache expiration in hours | `24` |
| enabledPlatforms | `Platform[]` | Platforms where extension is active | `['reddit', 'twitter', 'facebook']` |

**TonePreset Enum**:
```typescript
type TonePreset = 'friendly' | 'professional' | 'humorous' | 'concise';
```

**Validation Rules**:
- apiKey must match OpenAI key format (`sk-...`)
- cacheTTLHours must be between 1 and 168 (1 week)
- customToneText max 200 characters

### CacheEntry

Cached AI response stored in chrome.storage.local.

| Field | Type | Description |
|-------|------|-------------|
| cacheKey | `string` | Hash of URL + tone for lookup |
| threadUrl | `string` | Original thread URL |
| tone | `string` | Tone used for generation |
| suggestions | `AISuggestion[]` | Generated reply suggestions (3-5) |
| threadSummary | `string` | AI-generated thread summary |
| createdAt | `number` | Unix timestamp of creation |
| expiresAt | `number` | Unix timestamp of expiration |

**Validation Rules**:
- cacheKey is MD5 hash of normalized URL + tone
- Entry is invalid if `Date.now() > expiresAt`
- Max entry size: 100KB (enforced on write)

### AISuggestion

Individual AI-generated reply suggestion.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique suggestion ID (UUID) |
| text | `string` | Generated reply text |
| tone | `string` | Tone applied to this suggestion |
| generatedAt | `number` | Unix timestamp of generation |

**Validation Rules**:
- text max 2,000 characters
- 3-5 suggestions per analysis request

## Storage Schema

### chrome.storage.sync (User Preferences)

```typescript
interface SyncStorage {
  preferences: UserPreferences;
}
```

**Quota**: 100KB total, 8KB per item

### chrome.storage.local (Cache)

```typescript
interface LocalStorage {
  cache: {
    [cacheKey: string]: CacheEntry;
  };
  cacheIndex: {
    keys: string[];          // All cache keys for iteration
    totalSize: number;       // Approximate total size in bytes
    lastPruned: number;      // Timestamp of last prune operation
  };
}
```

**Quota**: 10MB total
**Pruning Strategy**: When `totalSize > 8MB`, remove oldest 20% of entries

## State Transitions

### Cache Entry Lifecycle

```
┌─────────────┐
│   Empty     │ (no cache for URL+tone)
└──────┬──────┘
       │ User requests analysis
       ▼
┌─────────────┐
│  Pending    │ (AI request in flight)
└──────┬──────┘
       │ AI response received
       ▼
┌─────────────┐
│   Valid     │ (createdAt < now < expiresAt)
└──────┬──────┘
       │ Time passes OR manual clear
       ▼
┌─────────────┐
│  Expired    │ (now > expiresAt)
└──────┬──────┘
       │ Next request triggers refresh
       ▼
┌─────────────┐
│  Pending    │ (cycle continues)
└─────────────┘
```

### Tone Selection Flow

```
User opens popup
       │
       ▼
┌──────────────────┐
│ Load preferences │
└────────┬─────────┘
         │
         ▼
   ┌─────────────┐
   │ Show current │
   │    tone      │
   └──────┬──────┘
          │ User changes tone
          ▼
   ┌──────────────┐
   │ Save to sync │
   │   storage    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Invalidate   │
   │ cache for    │
   │ current URL  │
   └──────────────┘
```

## Data Flow

### Thread Analysis Flow

```
1. User clicks "Analyze Thread"
2. Content script extracts ThreadContext via platform adapter
3. Content script sends message to service worker:
   { type: 'ANALYZE_THREAD', payload: ThreadContext }
4. Service worker checks cache by URL+tone hash
5a. If cache hit: Return cached CacheEntry.suggestions
5b. If cache miss:
    - Construct AI prompt with ThreadContext + tone
    - Call OpenAI API
    - Parse response into AISuggestion[]
    - Store CacheEntry
    - Return suggestions
6. Service worker sends response to content script
7. Content script forwards to popup for display
```

### Hotkey Rewrite Flow

```
1. User presses Cmd+Shift+R
2. Chrome commands API triggers service worker
3. Service worker sends message to content script:
   { type: 'GET_DRAFT_TEXT' }
4. Content script extracts text from active input field
5. Content script responds with draft text
6. Service worker:
   - Loads tone from preferences
   - Constructs rewrite prompt
   - Calls OpenAI API
   - Sends rewritten text back
7. Content script:
   - Shows toast notification
   - Inserts rewritten text into field
```

## Index Structures

### Cache Lookup

Primary index: `cacheKey` (MD5 hash)

```typescript
function generateCacheKey(url: string, tone: string): string {
  const normalizedUrl = normalizeUrl(url);
  return md5(`${normalizedUrl}:${tone}`);
}
```

### Expiration Scanning

Secondary index: `cacheIndex.keys` array with `createdAt` timestamps

Periodic cleanup (every hour via chrome.alarms):
1. Iterate through `cacheIndex.keys`
2. Check each entry's `expiresAt`
3. Remove expired entries
4. Update `cacheIndex.totalSize`
