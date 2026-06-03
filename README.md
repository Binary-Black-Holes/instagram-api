# @binary-black-holes/instagram-api

Type-safe, class-oriented Instagram Graph API integration module for Node.js 18+ and modern runtimes.

Built with Vite library mode, rich TypeScript interfaces, declarative JSDoc, and semantic versioning.

## Documentation for AI agents

If you are an AI coding agent (or prompting one) to integrate or extend this package, start with:

- **[AGENTS.md](./AGENTS.md)** — scope, constraints, decision trees, anti-patterns
- **[docs/AI_AGENT_GUIDE.md](./docs/AI_AGENT_GUIDE.md)** — full method catalog, types, workflows, test patterns
- **[docs/API_ALIGNMENT.md](./docs/API_ALIGNMENT.md)** — Meta endpoint mapping and production checklist

## Features

- **Class-oriented architecture** — `InstagramClient` exposes focused resource modules (`users`, `media`, `insights`)
- **Rich TypeScript interfaces** — strongly typed requests, responses, pagination, and OAuth payloads
- **Dual login support** — Facebook Login with Page tokens or Instagram Login with Instagram User tokens
- **OAuth helpers** — authorization URLs, code exchange, long-lived tokens, refresh, and token debugging
- **Resilient HTTP layer** — Axios-based transport with configurable timeouts, retries, and typed error mapping
- **Dual package exports** — ESM (`import`) and CommonJS (`require`) with declaration files
- **Pagination utilities** — async iteration and collection helpers for cursor-based endpoints

## Requirements

- Node.js 18 or newer
- Axios (installed automatically as a dependency)
- A Meta developer app with Instagram Graph API access
- An Instagram Business or Creator account
- For Facebook Login: the Instagram account must be connected to a Facebook Page

## Installation

```bash
npm install @binary-black-holes/instagram-api
```

## Quick Start: Facebook Login

```ts
import { InstagramClient, OAuthProvider } from '@binary-black-holes/instagram-api';

const oauth = new OAuthProvider({
  clientId: process.env.META_APP_ID!,
  clientSecret: process.env.META_APP_SECRET!,
  redirectUri: 'https://example.com/auth/instagram/callback',
});

// After OAuth, discover the connected Page + Instagram account
const accounts = await oauth.listConnectedAccounts(userAccessToken);
const page = accounts.data.find((entry) => entry.instagram_business_account?.id);

const client = new InstagramClient({
  accessToken: page!.access_token!,
  instagramAccountId: page!.instagram_business_account!.id,
  apiVersion: 'v21.0',
});

const profile = await client.users.getProfile({
  fields: ['id', 'username', 'followers_count', 'media_count'],
});

const mediaPage = await client.users.listMedia({ limit: 25 });
console.log(profile.username, mediaPage.data.length);
```

## Quick Start: Instagram Login

```ts
import { InstagramClient, OAuthProvider } from '@binary-black-holes/instagram-api';

const oauth = new OAuthProvider({
  loginType: 'instagram',
  clientId: process.env.INSTAGRAM_APP_ID!,
  clientSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: 'https://example.com/auth/instagram/callback',
});

const authUrl = oauth.getAuthorizationUrl({ state: 'secure-random-state' });
const shortLived = await oauth.exchangeCodeForToken(code);
const longLived = await oauth.exchangeForLongLivedToken(shortLived.access_token);

const client = new InstagramClient({
  loginType: 'instagram',
  accessToken: longLived.access_token,
  apiVersion: 'v25.0',
});

const profile = await client.users.getProfile({ fields: ['id', 'username'] });
```

## OAuth flow

Use `OAuthProvider` to implement either Meta login product. Facebook Login is the default and discovers a Page access token; Instagram Login is opt-in and uses Instagram User access tokens directly.

```ts
import { OAuthProvider } from '@binary-black-holes/instagram-api';

const oauth = new OAuthProvider({
  loginType: 'facebook', // or 'instagram'
  clientId: process.env.META_APP_ID!,
  clientSecret: process.env.META_APP_SECRET!,
  redirectUri: 'https://example.com/auth/instagram/callback',
});

// 1. Redirect the user to Meta OAuth
const authUrl = oauth.getAuthorizationUrl({ state: 'secure-random-state' });

// 2. Exchange authorization code after redirect
const shortLived = await oauth.exchangeCodeForToken(req.query.code);

// 3. Upgrade to long-lived token (~60 days)
const longLived = await oauth.exchangeForLongLivedToken(shortLived.access_token);

// 4. Refresh long-lived tokens before expiry
const refreshed = await oauth.refreshLongLivedToken(longLived.access_token);
```

### Default scopes

The SDK ships with three scope presets:

**Legacy Facebook Login apps** via `DEFAULT_OAUTH_SCOPES`:

- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

**Current business permission set** via `DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES`:

- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_comments`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

**Instagram Login** via `DEFAULT_INSTAGRAM_LOGIN_SCOPES`:

- `instagram_business_basic`

Override scopes per authorization request when needed. See [docs/API_ALIGNMENT.md](./docs/API_ALIGNMENT.md) for the full mapping to Meta documentation.

## Architecture

```text
InstagramClient
├── users      → profile, media listing, business discovery
├── media      → media lookup, comments, publishing, resumable uploads
├── hashtags   → hashtag search, recent media, top media
├── insights   → account and media analytics
├── commerce   → catalogs, product search, product tags
├── messaging  → direct messages and private replies
└── webhooks   → subscription management

OAuthProvider  → authorization, account discovery, token lifecycle
HttpClient     → Axios transport, retries, resumable uploads
```

Each resource extends `BaseResource` and shares a single authenticated `HttpClient` instance.

## API overview

### Users

```ts
await client.users.getProfile({ fields: ['id', 'username', 'biography'] });
await client.users.listMedia({ limit: 50 });
await client.users.listAllMedia();
```

### Media

```ts
await client.media.getById('media-id');
await client.media.listComments('media-id');
await client.media.createImageContainer({
  imageUrl: 'https://cdn.example/image.jpg',
  caption: 'Hello',
  altText: 'Product photo on a white background',
});
await client.media.publish('container-id');
await client.media.publishWhenReady('container-id', { enforceQuota: true });
await client.media.getContentPublishingLimit();
await client.media.setCommentHidden('comment-id', true);
```

### Hashtags

```ts
const search = await client.hashtags.search('coke');
const hashtagId = search.data[0]?.id;

if (hashtagId) {
  await client.hashtags.getById(hashtagId);
  await client.hashtags.listRecentMedia(hashtagId, {
    fields: ['id', 'media_type', 'comments_count', 'like_count'],
    limit: 25,
  });
  await client.hashtags.listTopMedia(hashtagId);
}
```

Hashtag media endpoints require Meta's Instagram Public Content Access feature.

### Webhook verification

```ts
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  parseVerifiedWebhookPayload,
} from '@binary-black-holes/instagram-api';

// Meta setup handshake (GET)
const challenge = verifyWebhookChallenge(req.query, process.env.WEBHOOK_VERIFY_TOKEN!);

// Event delivery (POST)
const payload = parseVerifiedWebhookPayload(rawBody, {
  signatureHeader: req.headers['x-hub-signature-256'],
  appSecret: process.env.META_APP_SECRET!,
});
```

### HTTP hooks

```ts
const client = new InstagramClient({
  accessToken: '...',
  instagramAccountId: '...',
  hooks: {
    onResponse: ({ path, status, durationMs }) => {
      metrics.record('instagram_api_request', { path, status, durationMs });
    },
  },
});
```

### Insights

```ts
await client.insights.getUserInsights({
  metrics: ['reach', 'accounts_engaged'],
  period: 'day',
});

await client.insights.getMediaInsights('media-id', {
  metrics: ['views', 'reach', 'saved'],
});
```

## Pagination

Graph API list endpoints are cursor-based. Use built-in helpers:

```ts
import { iteratePages, collectAllPages } from '@binary-black-holes/instagram-api';

for await (const item of iteratePages((options) => client.users.listMedia(options))) {
  console.log(item.id);
}

const allMedia = await collectAllPages((options) => client.users.listMedia(options));
```

## Error handling

Errors are mapped to typed classes:

| Class | Typical cause |
| --- | --- |
| `AuthenticationError` | Invalid or expired access token |
| `RateLimitError` | Graph API throttling |
| `NotFoundError` | Missing media/user/comment |
| `ValidationError` | Invalid SDK input before request |
| `InstagramApiError` | Base class for all SDK failures |

```ts
import { AuthenticationError, RateLimitError } from '@binary-black-holes/instagram-api';

try {
  await client.users.getProfile();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // refresh token
  }

  if (error instanceof RateLimitError) {
    // backoff using error.retryAfterMs
  }
}
```

## Configuration

```ts
const client = new InstagramClient({
  accessToken: '...',
  instagramAccountId: '17841400000000000',
  apiVersion: 'v21.0',
  timeoutMs: 30_000,
  retry: {
    maxRetries: 3,
    baseDelayMs: 750,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  axios: axios.create({
    // optional custom Axios instance, interceptors, proxies, etc.
  }),
  logger: {
    debug: (msg, meta) => console.debug(msg, meta),
    info: (msg, meta) => console.info(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
  },
});
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Outputs:

- `dist/index.js` — ESM entry
- `dist/index.cjs` — CommonJS entry
- `dist/index.d.ts` — bundled type declarations

## Semantic versioning

This package follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — incompatible public API changes
- **MINOR** — backward-compatible functionality
- **PATCH** — backward-compatible bug fixes

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Meta platform notes

- This SDK targets the **Instagram Graph API with Facebook Login**, not the legacy Instagram Basic Display API.
- `InstagramClient` requires a **Page access token** and the connected `instagram_business_account.id`.
- Use `OAuthProvider.listConnectedAccounts()` to resolve both values from `/me/accounts`.
- Publishing and insights require appropriate app review and permissions.
- Several insight metrics were deprecated by Meta in 2025; prefer `views` over `impressions` for media insights.
- See [docs/API_ALIGNMENT.md](./docs/API_ALIGNMENT.md) for the full endpoint mapping and verification checklist.

## License

MIT
