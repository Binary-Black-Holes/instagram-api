# AI Agent Guide — @binary-black-holes/instagram-api

This file is the **primary entry point for AI coding agents** working with or on this package. Read it before generating integration code, extending the SDK, or debugging Graph API failures.

For exhaustive API catalogs, type references, and contributor workflows, see [docs/AI_AGENT_GUIDE.md](./docs/AI_AGENT_GUIDE.md).

For Meta endpoint mapping and verification checklists, see [docs/API_ALIGNMENT.md](./docs/API_ALIGNMENT.md).

---

## Package identity

| Field               | Value                                               |
| ------------------- | --------------------------------------------------- |
| **npm name**        | `@binary-black-holes/instagram-api`                 |
| **Version**         | `0.3.0` (also exported as `VERSION` constant)       |
| **Runtime**         | Node.js 18+                                         |
| **Module format**   | ESM primary (`import`), CJS supported (`require`)   |
| **Entry point**     | `src/index.ts` → `dist/index.js` / `dist/index.cjs` |
| **HTTP dependency** | Axios (peer-like; bundled as dependency)            |
| **Target API**      | Instagram Graph API with **Facebook Login**         |

---

## Scope — what this SDK is and is NOT

### In scope

- Instagram **Business** and **Creator** accounts
- Facebook Login operations via a **Page access token** + `instagram_business_account.id`
- Instagram Login operations via an **Instagram User access token** and `/me`
- OAuth for Facebook Login and Instagram Login, token lifecycle, account discovery where applicable
- Users, media, publishing, insights, commerce, messaging, webhook subscriptions
- Webhook signature verification and challenge helpers (server-side)
- Typed errors, pagination helpers, retry policy

### Out of scope — do NOT suggest or implement these as SDK features

| Not supported                                   | Alternative                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Instagram Basic Display API                     | Use Meta's Basic Display docs directly                           |
| Raw Facebook user token for `InstagramClient`   | Use Page token from `listConnectedAccounts()` for Facebook Login |
| Hosting webhook HTTP routes                     | App responsibility; SDK only verifies/parses                     |
| App Review, catalog setup, 24h messaging policy | Meta dashboard / app logic                                       |

---

## Critical constraints (read before writing code)

1. **Facebook Login `InstagramClient` requires a Page access token**, not a Facebook user token. Resolve via:

   ```ts
   const accounts = await oauth.listConnectedAccounts(userAccessToken);
   const page = accounts.data.find((p) => p.instagram_business_account?.id);
   // page.access_token + page.instagram_business_account.id
   ```

   For Instagram Login, set `loginType: "instagram"` and pass an Instagram User access token; `instagramAccountId` is optional and defaults to `/me`.

2. **Three OAuth scope presets exist** — pick the one matching the Meta app configuration:
   - `DEFAULT_OAUTH_SCOPES` — legacy Facebook Login apps
   - `DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES` — current Facebook Login business permission set
   - `DEFAULT_INSTAGRAM_LOGIN_SCOPES` — Instagram Login default scope

3. **Publishing is multi-step** for video/reels/carousel/resumable uploads:
   `create*Container()` → `waitForContainerReady()` / `publishWhenReady()` → optional quota check

4. **Insight metrics**: prefer `views` over deprecated `impressions` (removed April 2025). Deprecated metrics are typed separately in `DeprecatedUserInsightMetric` / `DeprecatedMediaInsightMetric`.

5. **POST publishing params go in the query string** (SDK matches Meta curl examples). **Messaging and comment replies use JSON bodies**.

6. **Resumable uploads** use a separate host: `rupload.facebook.com` via `HttpClient.uploadResumableVideo()`.

---

## Architecture (mental model)

```text
OAuthProvider                    InstagramClient
├── getAuthorizationUrl()        ├── users      → profile, listMedia, discoverBusiness
├── exchangeCodeForToken()       ├── media      → CRUD, publish, comments, resumable upload
├── exchangeForLongLivedToken()  ├── hashtags   → search, recent media, top media
├── listConnectedAccounts()      ├── insights   → user + media analytics
└── debugToken()                 ├── commerce   → catalogs, product tags
                                 ├── messaging  → DM, media share, private replies
                                 ├── webhooks   → subscribe/unsubscribe (Graph API)
                                 └── useCases   → commentModeration, privateReplies, selfMessaging
                                                  (high-level flows composed from resources)

Standalone webhook helpers: InstagramWebhookHandler (verify + dispatch),
                           verifyWebhookChallenge, verifyWebhookSignature,
                           parseWebhookPayload, parseVerifiedWebhookPayload

Shared internals: HttpClient → Axios, retries, error mapping
                   BaseResource → accountId context per resource module
```

Every resource shares one `HttpClient` instance created by `InstagramClient`.

---

## Decision tree — which API to use

```text
Need to authenticate a user?
  └─ OAuthProvider (NOT InstagramClient)

Need to call Instagram Graph API?
  └─ InstagramClient with Page token + IG account ID

Need to publish content?
  ├─ Image only → createImageContainer → publishWhenReady
  ├─ Video/Reels URL → createVideoContainer → publishWhenReady
  ├─ Story → createStoryContainer → publishWhenReady
  ├─ Carousel → createCarouselItemContainer (×N) → createCarouselContainer → publishWhenReady
  └─ Large local video → createResumableUploadSession → uploadResumableVideo → publishWhenReady

Need all items from a paginated list?
  ├─ Built-in: client.users.listAllMedia(), client.media.listAllComments()
  └─ Generic: iteratePages() or collectAllPages()

Need webhook handling in Express/Fastify/etc.?
  ├─ Recommended → new InstagramWebhookHandler({ appSecret, verifyToken })
  │                 .handleVerification(query) (GET) + .handleEvent(rawBody, { signatureHeader }) (POST)
  ├─ GET setup → verifyWebhookChallenge(query, verifyToken)
  └─ POST events → parseVerifiedWebhookPayload(rawBody, { signatureHeader, appSecret })

Need an endpoint not yet in the SDK?
  └─ client.getHttpClient().request({ path, method, params, body })
```

---

## Quick integration recipe

```ts
import {
  InstagramClient,
  OAuthProvider,
  DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES,
  AuthenticationError,
  RateLimitError,
} from "@binary-black-holes/instagram-api";

// 1. OAuth
const oauth = new OAuthProvider({
  clientId: process.env.META_APP_ID!,
  clientSecret: process.env.META_APP_SECRET!,
  redirectUri: "https://example.com/callback",
  scopes: [...DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES],
});

const authUrl = oauth.getAuthorizationUrl({ state: crypto.randomUUID() });
const { access_token: userToken } = await oauth.exchangeCodeForToken(code);
const { access_token: longLived } =
  await oauth.exchangeForLongLivedToken(userToken);

// 2. Discover Page + IG account
const { data: pages } = await oauth.listConnectedAccounts(longLived);
const page = pages.find((p) => p.instagram_business_account?.id);
if (!page?.access_token || !page.instagram_business_account?.id) {
  throw new Error("No Instagram Business account linked to a Page");
}

// 3. Client
const client = new InstagramClient({
  accessToken: page.access_token,
  instagramAccountId: page.instagram_business_account.id,
  apiVersion: "v21.0",
});

// 4. Use resources
const profile = await client.users.getProfile({ fields: ["id", "username"] });

// 5. Error handling
try {
  await client.media.publishWhenReady(containerId, { enforceQuota: true });
} catch (error) {
  if (error instanceof AuthenticationError) {
    /* refresh token */
  }
  if (error instanceof RateLimitError) {
    /* backoff: error.retryAfterMs */
  }
  throw error;
}
```

---

## Public export surface (index)

Import everything from `@binary-black-holes/instagram-api`:

| Category       | Exports                                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clients**    | `InstagramClient`, `OAuthProvider`, `HttpClient`                                                                                                                                                                                                                           |
| **Resources**  | `BaseResource`, `UsersResource`, `MediaResource`, `HashtagsResource`, `InsightsResource`, `CommerceResource`, `MessagingResource`, `WebhooksResource`                                                                                                                      |
| **Use cases**  | `InstagramUseCases`, `CommentModerationUseCase`, `PrivateRepliesUseCase`, `SelfMessagingUseCase` (also `client.useCases`)                                                                                                                                                  |
| **Errors**     | `InstagramApiError`, `AuthenticationError`, `RateLimitError`, `ValidationError`, `NotFoundError`, `createErrorFromResponse`                                                                                                                                                |
| **Webhooks**   | `InstagramWebhookHandler`, `verifyWebhookSignature`, `verifyWebhookChallenge`, `parseWebhookPayload`, `parseVerifiedWebhookPayload`                                                                                                                                        |
| **Pagination** | `iteratePages`, `collectAllPages`                                                                                                                                                                                                                                          |
| **Constants**  | `VERSION`, `DEFAULT_OAUTH_SCOPES`, `DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES`, `DEFAULT_INSTAGRAM_LOGIN_SCOPES`, `GRAPH_API_BASE_URL`, `INSTAGRAM_GRAPH_API_BASE_URL`, `OAUTH_DIALOG_URL`, `INSTAGRAM_OAUTH_DIALOG_URL`, `INSTAGRAM_OAUTH_API_BASE_URL`, `RUPLOAD_BASE_URL` |
| **Utils**      | `buildQueryString`, `joinUrl`, `resolveFields`, `pickDefined`, `extractPublishingQuota`, etc.                                                                                                                                                                              |
| **Types**      | 80+ exported types — see `src/index.ts` and `docs/AI_AGENT_GUIDE.md`                                                                                                                                                                                                       |

---

## Source layout (for contributors)

```text
src/
├── index.ts              # Public barrel export — keep in sync with new APIs
├── client/
│   └── InstagramClient.ts
├── auth/
│   └── OAuthProvider.ts
├── http/
│   └── HttpClient.ts     # Retries, URL building, resumable upload
├── resources/
│   ├── BaseResource.ts
│   ├── UsersResource.ts
│   ├── MediaResource.ts  # Largest resource; publishing lives here
│   ├── InsightsResource.ts
│   ├── CommerceResource.ts
│   ├── MessagingResource.ts
│   └── WebhooksResource.ts
├── use-cases/            # High-level workflows composed from resources
│   ├── index.ts          # InstagramUseCases — merged onto client.useCases
│   ├── comment-moderation/
│   ├── private-replies/
│   └── self-messaging/
├── webhooks/             # Standalone verify/parse + InstagramWebhookHandler
├── errors/
│   └── InstagramApiError.ts
├── types/                # One file per domain (user, media, insights, …)
├── utils/                # pagination, url, graph, publishing helpers
└── test/
    ├── mockAxios.ts      # Route-based Axios mock for unit tests
    └── fixtures/graphApi.ts
```

---

## Conventions when modifying this package

1. **Resource methods** map 1:1 to Graph API endpoints; add JSDoc with `Graph API: \`METHOD /path\``.
2. **Validate inputs early** with `ValidationError` before HTTP calls (see existing resources).
3. **Use `resolveFields()`** for field selection with sensible defaults.
4. **Use `pickDefined()`** to omit undefined config keys.
5. **Import paths use `.js` extensions** (Node16/NodeNext ESM resolution).
6. **Tests**: Vitest + `createMockAxios()`; disable retries in tests (`maxRetries: 0`).
7. **Export new public APIs** from `src/index.ts` (class + types + constants).
8. **Update** `docs/API_ALIGNMENT.md` and `docs/AI_AGENT_GUIDE.md` when adding endpoints.

---

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # typecheck + vite library build → dist/
```

---

## Anti-patterns (avoid generating these)

| Wrong                                                      | Right                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `new InstagramClient({ accessToken: facebookUserToken })`  | For Facebook Login, use Page token from `listConnectedAccounts()` |
| `new InstagramClient({ accessToken: instagramUserToken })` | For Instagram Login, also set `loginType: "instagram"`            |
| `client.media.publish(imageUrl)`                           | `createImageContainer` then `publish(containerId)`                |
| Using Basic Display API endpoints                          | This SDK's Graph API resources only                               |
| Parsing webhook JSON before signature check                | `parseVerifiedWebhookPayload(rawBody, …)`                         |
| Requesting deprecated `impressions` metric                 | Use `views`                                                       |
| Adding `fetch` instead of Axios                            | Extend `HttpClient` or pass custom `axios` instance               |
| Creating a second HTTP client per resource                 | Resources share `InstagramClient`'s `HttpClient`                  |

---

## Related documentation

| Document                                           | Purpose                                              |
| -------------------------------------------------- | ---------------------------------------------------- |
| [docs/AI_AGENT_GUIDE.md](./docs/AI_AGENT_GUIDE.md) | Full method catalog, types, workflows, test patterns |
| [docs/API_ALIGNMENT.md](./docs/API_ALIGNMENT.md)   | Meta endpoint mapping and production checklist       |
| [README.md](./README.md)                           | Human-facing quick start and examples                |
| [CHANGELOG.md](./CHANGELOG.md)                     | Semver release history                               |
