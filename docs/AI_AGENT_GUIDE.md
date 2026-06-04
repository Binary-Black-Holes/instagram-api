# AI Agent Reference — @binary-black-holes/instagram-api

Comprehensive reference for AI agents integrating, extending, or debugging this package. Pair with [AGENTS.md](../AGENTS.md) for quick constraints and decision trees.

---

## Table of contents

1. [Authentication and token model](#1-authentication-and-token-model)
2. [InstagramClient configuration](#2-instagramclient-configuration)
3. [Complete resource method catalog](#3-complete-resource-method-catalog)
4. [OAuthProvider method catalog](#4-oauthprovider-method-catalog)
5. [Webhook helpers](#5-webhook-helpers)
6. [Publishing workflows](#6-publishing-workflows)
7. [Pagination](#7-pagination)
8. [Error model](#8-error-model)
9. [Type reference highlights](#9-type-reference-highlights)
10. [Utility functions](#10-utility-functions)
11. [HTTP layer internals](#11-http-layer-internals)
12. [Extending the SDK](#12-extending-the-sdk)
13. [Testing patterns](#13-testing-patterns)
14. [Meta platform pitfalls](#14-meta-platform-pitfalls)
15. [Official Meta links](#15-official-meta-links)

---

## 1. Authentication and token model

### Token types

| Token                               | Source                                             | Used by                                                  | Lifetime                                  |
| ----------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| **Authorization code**              | OAuth redirect                                     | `exchangeCodeForToken()`                                 | Single use                                |
| **Facebook short-lived user token** | Facebook Login code exchange                       | `exchangeForLongLivedToken()`, `listConnectedAccounts()` | ~1 hour                                   |
| **Facebook long-lived user token**  | Facebook token exchange                            | Account discovery, refresh                               | ~60 days                                  |
| **Page access token**               | `listConnectedAccounts()` → `access_token` on Page | `InstagramClient` with `loginType: 'facebook'`           | Tied to Page; refresh via user token flow |
| **Instagram User access token**     | Instagram Login code exchange/token exchange       | `InstagramClient` with `loginType: 'instagram'`          | Short-lived or ~60 days                   |

### Facebook Login flow

```text
1. new OAuthProvider({ loginType: 'facebook', ... })   [loginType optional; default]
2. OAuthProvider.getAuthorizationUrl({ state })
3. User authorizes → redirect with ?code=
4. OAuthProvider.exchangeCodeForToken(code)
5. OAuthProvider.exchangeForLongLivedToken(shortLivedToken)   [recommended]
6. OAuthProvider.listConnectedAccounts(longLivedUserToken)
7. Extract page.access_token + page.instagram_business_account.id
8. new InstagramClient({ accessToken: pageToken, instagramAccountId })
```

### Instagram Login flow

```text
1. new OAuthProvider({ loginType: 'instagram', ... })
2. User authorizes → redirect with ?code=
3. OAuthProvider.exchangeCodeForToken(code)
4. OAuthProvider.exchangeForLongLivedToken(shortLivedInstagramToken)
5. new InstagramClient({ loginType: 'instagram', accessToken })
```

### OAuth scopes

**Legacy** (`DEFAULT_OAUTH_SCOPES`):

- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

**Current business set** (`DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES`):

- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_comments`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

**Instagram Login** (`DEFAULT_INSTAGRAM_LOGIN_SCOPES`):

- `instagram_business_basic`

**Additional scopes** (pass explicitly when needed):

- Messaging: `instagram_manage_messages` or `instagram_business_manage_messages`
- Commerce: catalog permissions per Meta docs

Override per request:

```ts
oauth.getAuthorizationUrl({
  scopes: ["instagram_business_basic", "pages_show_list"],
});
```

### Token refresh

```ts
const refreshed = await oauth.refreshLongLivedToken(existingLongLivedToken);
client.setAccessToken(newPageToken); // after re-fetching Page token if needed
```

With `loginType: 'facebook'`, refresh uses Facebook Login token exchange on `graph.facebook.com`. With `loginType: 'instagram'`, refresh uses Meta's Instagram Login `GET https://graph.instagram.com/refresh_access_token` endpoint.

### Token introspection

```ts
const info = await oauth.debugToken(inputToken, appOrUserToken);
// info.is_valid, info.expires_at, info.scopes
```

---

## 2. InstagramClient configuration

```ts
interface InstagramClientConfig {
  loginType?: "facebook" | "instagram"; // default 'facebook'
  accessToken: string; // Page token for Facebook Login; Instagram User token for Instagram Login
  instagramAccountId?: string; // REQUIRED for Facebook Login; optional for Instagram Login (/me)
  apiVersion?: GraphApiVersion; // default 'v21.0'; v19.0–v25.0 typed
  timeoutMs?: number; // default 30000
  retry?: Partial<RetryPolicy>; // default maxRetries: 2, baseDelayMs: 500
  axios?: AxiosInstance; // custom instance for interceptors/testing
  logger?: Logger; // debug/info/warn/error
  hooks?: HttpClientHooks; // onRequest, onResponse, onError
}
```

### Runtime mutators

```ts
client.setAccessToken(newToken);
client.setInstagramAccountId(newAccountId);
client.getInstagramAccountId();
client.getHttpClient(); // escape hatch for undocumented endpoints
```

### Default retry policy

```ts
{
  maxRetries: 2,
  baseDelayMs: 500,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}
```

Retries honor `Retry-After` header when present (surfaced on `RateLimitError.retryAfterMs`).

---

## 3. Complete resource method catalog

### `client.users` — UsersResource

| Method                      | Graph API                                                        | Returns                     | Notes                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `getProfile(options?)`      | `GET /{ig-user-id}?fields=...`                                   | `InstagramUser`             | Default fields: id, username, name, biography, website, followers_count, follows_count, media_count, profile_picture_url |
| `listMedia(options?)`       | `GET /{ig-user-id}/media`                                        | `UserMediaResponse`         | Paginated; supports limit, after, before, fields                                                                         |
| `listAllMedia(options?)`    | Paginated helper                                                 | `InstagramMedia[]`          | Auto-follows cursors                                                                                                     |
| `discoverBusiness(options)` | `GET /{ig-user-id}?fields=business_discovery.username(...){...}` | `BusinessDiscoveryResponse` | Requires `username`; competitor analytics                                                                                |

**Example — business discovery:**

```ts
const result = await client.users.discoverBusiness({
  username: "competitor",
  fields: ["username", "followers_count", "media_count"],
});
const business = result.business_discovery;
```

---

### `client.media` — MediaResource

| Method                                         | Graph API                                    | Returns                               |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| `getById(mediaId, options?)`                   | `GET /{ig-media-id}`                         | `InstagramMedia`                      |
| `listComments(mediaId, options?)`              | `GET /{ig-media-id}/comments`                | `PaginatedResponse<InstagramComment>` |
| `listAllComments(mediaId, options?)`           | Paginated helper                             | `InstagramComment[]`                  |
| `createImageContainer(input)`                  | `POST /{ig-user-id}/media`                   | `MediaContainerResponse`              |
| `createStoryContainer(input)`                  | `POST /{ig-user-id}/media`                   | `MediaContainerResponse`              |
| `createVideoContainer(input)`                  | `POST /{ig-user-id}/media`                   | `MediaContainerResponse`              |
| `createCarouselItemContainer(input)`           | `POST /{ig-user-id}/media`                   | `MediaContainerResponse`              |
| `createCarouselContainer(input)`               | `POST /{ig-user-id}/media`                   | `MediaContainerResponse`              |
| `createResumableUploadSession(input)`          | `POST /{ig-user-id}/media`                   | `ResumableUploadSessionResponse`      |
| `uploadResumableVideo(input)`                  | `POST rupload.facebook.com/...`              | `{ success?, message? }`              |
| `getContainerStatus(containerId)`              | `GET /{ig-container-id}?fields=status_code`  | `MediaContainerStatus`                |
| `waitForContainerReady(containerId, options?)` | Poll status                                  | `MediaContainerStatus`                |
| `publish(containerId)`                         | `POST /{ig-user-id}/media_publish`           | `PublishMediaResponse`                |
| `publishWhenReady(containerId, options?)`      | Quota + poll + publish                       | `PublishMediaResponse`                |
| `assertPublishingQuotaAvailable()`             | `GET /{ig-user-id}/content_publishing_limit` | `PublishingQuotaSummary`              |
| `getContentPublishingLimit(options?)`          | `GET /{ig-user-id}/content_publishing_limit` | `ContentPublishingLimitResponse`      |
| `replyToComment(commentId, input)`             | `POST /{ig-comment-id}/replies`              | `CommentReplyResponse`                |
| `deleteComment(commentId)`                     | `DELETE /{ig-comment-id}`                    | `{ success: boolean }`                |
| `setCommentHidden(commentId, hidden)`          | `POST /{ig-comment-id}?hide=`                | `{ success: boolean }`                |

**Container input shapes:**

```ts
// Image
createImageContainer({
  imageUrl: string;      // publicly accessible HTTPS URL
  caption?: string;
  altText?: string;
  locationId?: string;
  userTags?: Array<{ username: string; x?: number; y?: number }>;
});

// Video / Reels
createVideoContainer({
  videoUrl: string;
  mediaType?: 'VIDEO' | 'REELS' | 'STORIES';  // default 'REELS'
  caption?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
});

// Story
createStoryContainer({
  mediaType: 'STORIES';
  imageUrl?: string;     // one of imageUrl or videoUrl required
  videoUrl?: string;
  coverUrl?: string;
});

// Carousel item (repeat for each slide, max 10)
createCarouselItemContainer({ imageUrl?, videoUrl?, altText?, userTags? });

// Carousel container
createCarouselContainer({
  children: string[];    // container IDs from createCarouselItemContainer
  caption?: string;
  shareToFeed?: boolean;
  collaborators?: string[];
  locationId?: string;
  productTags?: ProductTagInput[];
});

// Resumable upload session
createResumableUploadSession({
  mediaType: 'REELS' | 'VIDEO';
  caption?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  collaborators?: string[];
  locationId?: string;
});

uploadResumableVideo({
  containerId: string;
  file: Uint8Array;
  fileSize: number;
  offset?: number;
});
```

**Container status codes:** `EXPIRED`, `ERROR`, `FINISHED`, `IN_PROGRESS`, `PUBLISHED`

**waitForContainerReady defaults:** `intervalMs: 2000`, `maxAttempts: 30`

---

### `client.hashtags` — HashtagsResource

| Method                                 | Graph API                                           | Returns                 | Notes                                           |
| -------------------------------------- | --------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `search(hashtag)`                      | `GET /ig_hashtag_search?user_id={ig-user-id}&q=...` | `HashtagSearchResponse` | Accepts `tag` or `#tag`; returns IG Hashtag IDs |
| `getById(hashtagId, options?)`         | `GET /{ig-hashtag-id}?fields=...`                   | `InstagramHashtag`      | Default fields: id, name                        |
| `listRecentMedia(hashtagId, options?)` | `GET /{ig-hashtag-id}/recent_media`                 | `HashtagMediaResponse`  | Sends required `user_id`; paginated             |
| `listTopMedia(hashtagId, options?)`    | `GET /{ig-hashtag-id}/top_media`                    | `HashtagMediaResponse`  | Sends required `user_id`; paginated             |

Hashtag media endpoints require Instagram Public Content Access and are subject to Meta's public content limitations, including the 30 unique hashtags per 7 days cap.

**Example — hashtag lookup and media:**

```ts
const result = await client.hashtags.search("coke");
const hashtagId = result.data[0]?.id;

if (hashtagId) {
  const recent = await client.hashtags.listRecentMedia(hashtagId, {
    fields: ["id", "media_type", "comments_count", "like_count"],
    limit: 25,
  });
}
```

---

### `client.insights` — InsightsResource

| Method                               | Graph API                     | Required options                |
| ------------------------------------ | ----------------------------- | ------------------------------- |
| `getUserInsights(options)`           | `GET /{ig-user-id}/insights`  | `metrics: UserInsightMetric[]`  |
| `getMediaInsights(mediaId, options)` | `GET /{ig-media-id}/insights` | `metrics: MediaInsightMetric[]` |

**User insight options:**

```ts
{
  metrics: UserInsightMetric[];     // required, non-empty
  period?: 'day' | 'week' | 'days_28' | 'lifetime';  // default 'day'
  timeframe?: InsightTimeframe;
  breakdown?: UserInsightBreakdown;
  metricType?: 'total_value' | 'average';
  since?: number;   // Unix timestamp
  until?: number;
}
```

**Current user metrics:** `reach`, `follower_count`, `online_followers`, `accounts_engaged`, `total_interactions`, `likes`, `comments`, `shares`, `saves`, `replies`, `views`, `reposts`, `profile_links_taps`, `follows`, `demographics`

**Current media metrics:** `reach`, `views`, `likes`, `comments`, `saved`, `shares`, `total_interactions`, `follows`, `profile_activity`, `profile_visits`, `navigation`, `replies`, `reposts`, `crossposted_views`, `facebook_views`, `ig_reels_avg_watch_time`, `ig_reels_video_view_total_time`, `reels_skip_rate`, `total_comments`, `total_likes`

**Deprecated (avoid):** `impressions`, `plays`, `profile_views`, `video_views`, etc. — still typed for migration but will fail at API level.

---

### `client.commerce` — CommerceResource

| Method                             | Graph API                                     | Notes                     |
| ---------------------------------- | --------------------------------------------- | ------------------------- |
| `listAvailableCatalogs()`          | `GET /{ig-user-id}?fields=available_catalogs` |                           |
| `searchCatalogProducts(options)`   | `GET /{ig-user-id}/catalog_product_search`    | Requires `catalogId`      |
| `listProductTags(mediaId)`         | `GET /{ig-media-id}/product_tags`             |                           |
| `updateProductTags(mediaId, tags)` | `POST /{ig-media-id}/product_tags`            | `updated_tags` serialized |

---

### `client.messaging` — MessagingResource

| Method                    | Graph API                     | Input                      |
| ------------------------- | ----------------------------- | -------------------------- |
| `sendTextMessage(input)`  | `POST /{ig-user-id}/messages` | `{ recipientId, text }`    |
| `sendMediaShare(input)`   | `POST /{ig-user-id}/messages` | `{ recipientId, mediaId }` |
| `sendPrivateReply(input)` | `POST /{ig-user-id}/messages` | `{ commentId, text }`      |

All messaging methods send JSON body: `{ recipient, message }`.

**Requires:** `instagram_manage_messages` or `instagram_business_manage_messages` + App Review.

**App responsibility:** enforce Instagram's 24-hour messaging window policy.

---

### `client.webhooks` — WebhooksResource

Graph API subscription management (not HTTP route hosting):

| Method                | Graph API                                                  |
| --------------------- | ---------------------------------------------------------- |
| `subscribe(options)`  | `POST /{ig-user-id}/subscribed_apps?subscribed_fields=...` |
| `unsubscribe()`       | `DELETE /{ig-user-id}/subscribed_apps`                     |
| `listSubscriptions()` | `GET /{ig-user-id}/subscribed_apps`                        |

```ts
await client.webhooks.subscribe({
  fields: ["comments", "messages", "mentions"], // WebhookField[]
});
```

---

## 4. OAuthProvider method catalog

| Method                                             | Purpose                                                        |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `getAuthorizationUrl(options?)`                    | Build Facebook or Instagram OAuth dialog URL                   |
| `exchangeCodeForToken(code)`                       | Short-lived user token for selected login product              |
| `exchangeForLongLivedToken(shortLivedToken)`       | ~60 day user token for selected login product                  |
| `refreshLongLivedToken(longLivedToken)`            | Refresh long-lived user token before expiry                    |
| `debugToken(inputToken, accessToken)`              | Token metadata                                                 |
| `listConnectedAccounts(userAccessToken, options?)` | Facebook Login only: `GET /me/accounts` with IG account fields |
| `getAxiosInstance()`                               | Underlying Axios for testing                                   |

**listConnectedAccounts default fields:** `id`, `name`, `access_token`, `instagram_business_account`

**Connected page shape:**

```ts
interface ConnectedFacebookPage {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id: string };
}
```

---

## 5. Webhook helpers

Standalone functions — no `InstagramClient` required.

### Verification handshake (GET)

```ts
import { verifyWebhookChallenge } from "@binary-black-holes/instagram-api";

// Express example
app.get("/webhooks/instagram", (req, res) => {
  const challenge = verifyWebhookChallenge(
    req.query,
    process.env.WEBHOOK_VERIFY_TOKEN!,
  );
  res.status(200).send(challenge);
});
```

Query shape (`WebhookChallengeQuery`):

- `hub.mode` — must be `'subscribe'`
- `hub.verify_token` — must match your configured token
- `hub.challenge` — echoed back on success

### Event delivery (POST)

```ts
import { parseVerifiedWebhookPayload } from "@binary-black-holes/instagram-api";

app.post(
  "/webhooks/instagram",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const payload = parseVerifiedWebhookPayload(req.body, {
      signatureHeader: req.headers["x-hub-signature-256"] as string,
      appSecret: process.env.META_APP_SECRET!,
    });
    // payload.object, payload.entry[]
    res.sendStatus(200);
  },
);
```

**Critical:** use raw body bytes for signature verification, not parsed JSON.

### Lower-level helpers

```ts
verifyWebhookSignature(rawBody, signatureHeader, appSecret); // boolean
parseWebhookPayload(jsonString); // no verification
```

---

## 6. Publishing workflows

### Standard image post

```ts
const { id: containerId } = await client.media.createImageContainer({
  imageUrl: "https://cdn.example.com/photo.jpg",
  caption: "Hello world",
  altText: "Description for accessibility",
});
const { id: mediaId } = await client.media.publishWhenReady(containerId, {
  enforceQuota: true,
});
```

### Reels from URL

```ts
const { id: containerId } = await client.media.createVideoContainer({
  videoUrl: "https://cdn.example.com/reel.mp4",
  mediaType: "REELS",
  caption: "New reel",
  shareToFeed: true,
});
await client.media.publishWhenReady(containerId);
```

### Carousel (multi-step)

```ts
const items = await Promise.all([
  client.media.createCarouselItemContainer({
    imageUrl: "https://cdn.example.com/1.jpg",
  }),
  client.media.createCarouselItemContainer({
    imageUrl: "https://cdn.example.com/2.jpg",
  }),
]);
const { id: carouselId } = await client.media.createCarouselContainer({
  children: items.map((i) => i.id),
  caption: "Swipe through",
});
await client.media.publishWhenReady(carouselId, { enforceQuota: true });
```

### Resumable upload (large local file)

```ts
const file = await readFile("video.mp4");
const { id: containerId } = await client.media.createResumableUploadSession({
  mediaType: "REELS",
  caption: "Uploaded locally",
});
await client.media.uploadResumableVideo({
  containerId,
  file: new Uint8Array(file),
  fileSize: file.length,
});
await client.media.publishWhenReady(containerId);
```

### Quota check

```ts
const limit = await client.media.getContentPublishingLimit();
const quota = extractPublishingQuota(limit);
// quota.usage, quota.total, quota.remaining

await client.media.assertPublishingQuotaAvailable(); // throws ValidationError if exhausted
```

---

## 7. Pagination

Graph API returns cursor-based pages:

```ts
interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
}
```

### Manual pagination

```ts
let after: string | undefined;
do {
  const page = await client.users.listMedia({ limit: 25, after });
  for (const item of page.data) {
    /* ... */
  }
  after = page.paging?.cursors?.after;
} while (after && page.paging?.next);
```

### Async iteration

```ts
import {
  iteratePages,
  collectAllPages,
} from "@binary-black-holes/instagram-api";

for await (const media of iteratePages((opts) =>
  client.users.listMedia(opts),
)) {
  console.log(media.id);
}

const allMedia = await collectAllPages((opts) => client.users.listMedia(opts));
```

Built-in `listAllMedia()` and `listAllComments()` wrap `collectAllPages` internally.

---

## 8. Error model

### Class hierarchy

```text
Error
└── InstagramApiError
    ├── AuthenticationError   (401, 403, Graph code 190)
    ├── RateLimitError        (429, Graph codes 4, 17, 32) + retryAfterMs
    ├── NotFoundError         (404, Graph code 803)
    └── ValidationError       (SDK input validation; also OAuth failures in OAuthProvider)
```

### Handling pattern

```ts
import {
  InstagramApiError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
} from "@binary-black-holes/instagram-api";

try {
  await client.users.getProfile();
} catch (error) {
  if (error instanceof ValidationError) {
    // Fix caller input
  } else if (error instanceof AuthenticationError) {
    // Refresh Page token via OAuth flow
  } else if (error instanceof RateLimitError) {
    await sleep(error.retryAfterMs ?? 60_000);
  } else if (error instanceof NotFoundError) {
    // Resource deleted or wrong ID
  } else if (error instanceof InstagramApiError) {
    console.error(error.toJSON()); // structured logging
  }
  throw error;
}
```

### Error metadata

```ts
error.code; // Meta Graph API error code
error.subcode; // error_subcode
error.type; // Meta error type
error.status; // HTTP status
error.traceId; // fbtrace_id for Meta support
error.graphError; // full GraphApiErrorBody
```

### createErrorFromResponse

Used internally by `HttpClient`. Agents extending HTTP behavior should route failures through this function for consistent typing.

---

## 9. Type reference highlights

All types export from the package root. Source of truth: `src/index.ts`.

### Configuration types

- `InstagramClientConfig`, `OAuthConfig`, `AuthorizationUrlOptions`
- `RetryPolicy`, `Logger`, `HttpClientHooks`, `HttpRequestConfig`

### Domain types

| File                 | Key types                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| `types/user.ts`      | `InstagramUser`, `InstagramUserField`, `ListUserMediaOptions`                        |
| `types/media.ts`     | `InstagramMedia`, `CreateImageMediaInput`, `MediaContainerStatus`, publishing inputs |
| `types/insights.ts`  | `UserInsightMetric`, `MediaInsightMetric`, `InsightsResponse`                        |
| `types/commerce.ts`  | `InstagramCatalog`, `ProductTag`, `CatalogProductSearchOptions`                      |
| `types/messaging.ts` | `SendTextMessageInput`, `SendPrivateReplyInput`                                      |
| `types/webhooks.ts`  | `WebhookField`, `InstagramWebhookPayload`, `WebhookChallengeQuery`                   |
| `types/discovery.ts` | `BusinessDiscoveryOptions`, `DiscoveredBusiness`                                     |
| `types/account.ts`   | `ConnectedFacebookPage`, `ContentPublishingLimit`                                    |
| `types/common.ts`    | `PaginatedResponse`, `GraphApiVersion`, OAuth constants                              |

### GraphApiVersion

`'v19.0' | 'v20.0' | 'v21.0' | 'v22.0' | 'v23.0' | 'v24.0' | 'v25.0'`

Default: `'v21.0'`

---

## 10. Utility functions

| Function                                         | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `iteratePages(fetchPage, options?)`              | Async generator over paginated results          |
| `collectAllPages(fetchPage, options?)`           | Flatten all pages to array                      |
| `resolveFields(requested, defaults)`             | Merge field arrays for Graph API `fields` param |
| `buildQueryString(params)`                       | URL-encode query parameters                     |
| `joinUrl(...segments)`                           | Join URL path segments                          |
| `parseRetryAfterMs(header)`                      | Parse Retry-After header value                  |
| `sleep(ms)`                                      | Promise-based delay                             |
| `pickDefined(obj)`                               | Strip undefined keys from objects               |
| `buildBusinessDiscoveryFields(username, fields)` | Build business_discovery field string           |
| `serializeCarouselChildren(ids)`                 | Comma-join carousel child IDs                   |
| `serializeProductTags(tags)`                     | JSON-serialize product tags for API             |
| `extractPublishingQuota(response)`               | Parse quota usage/remaining from limit response |

---

## 11. HTTP layer internals

### URL construction

```text
Graph API:  https://graph.facebook.com/{apiVersion}/{path}?access_token=...&...
Resumable:  https://rupload.facebook.com/ig-api-upload/{apiVersion}/{containerId}
OAuth:      https://www.facebook.com/{apiVersion}/dialog/oauth?...
```

### Request behavior

- `access_token` always appended as query param for Graph API
- POST with `body` → `Content-Type: application/json` (messaging, replies)
- POST with `params` only → query string (publishing)
- Resumable upload → `Authorization: OAuth {token}`, binary body
- `validateStatus: () => true` on Axios — errors handled in SDK

### Hooks for observability

```ts
hooks: {
  onRequest: ({ method, path, url }) => {},
  onResponse: ({ method, path, url, status, durationMs }) => {},
  onError: ({ method, path, url, error, durationMs }) => {},
}
```

### Escape hatch

```ts
const http = client.getHttpClient();
const { data } = await http.request<MyType>({
  path: "/experimental-endpoint",
  method: "GET",
  params: { fields: "id,name" },
});
```

---

## 12. Extending the SDK

### Adding a new resource method

1. Add types in `src/types/{domain}.ts`
2. Implement method on the appropriate `*Resource.ts` class
3. Validate inputs with `ValidationError` before HTTP
4. Use `this.http.request<T>({ path, method, params, body })`
5. Add JSDoc with Graph API endpoint reference
6. Export types from `src/types/index.ts` and `src/index.ts`
7. Add unit test with `createMockAxios()`
8. Update `docs/API_ALIGNMENT.md` and this guide

### Adding a new resource module

1. Create `src/resources/NewResource.ts` extending `BaseResource`
2. Wire in `InstagramClient` constructor
3. Export from `src/resources/index.ts` and `src/index.ts`

### BaseResource pattern

```ts
export class ExampleResource extends BaseResource {
  async doThing(options = {}): Promise<Thing> {
    const accountId = this.resolveAccountId(); // supports per-request override if added
    const response = await this.http.request<Thing>({
      path: `/${accountId}/things`,
      params: {
        /* ... */
      },
    });
    return response.data;
  }
}
```

---

## 13. Testing patterns

### Stack

- **Runner:** Vitest (`npm test`)
- **Mock HTTP:** `createMockAxios()` from `src/test/mockAxios.ts`
- **Fixtures:** `src/test/fixtures/graphApi.ts`

### Standard test setup

```ts
import { describe, expect, it } from "vitest";
import { HttpClient } from "../http/HttpClient.js";
import { MediaResource } from "../resources/MediaResource.js";
import { createMockAxios } from "../test/mockAxios.js";

const ACCOUNT_ID = "17841405309211844";

function createResource() {
  const mock = createMockAxios();
  const http = new HttpClient({
    accessToken: "page-token",
    apiVersion: "v21.0",
    axios: mock.axios,
    retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
  });
  return { resource: new MediaResource(http, ACCOUNT_ID), mock };
}

it("example", async () => {
  const { resource, mock } = createResource();
  mock.setResponseFor("/media", { status: 200, data: { id: "123" } });
  const result = await resource.createImageContainer({
    imageUrl: "https://example.com/a.jpg",
  });
  expect(result.id).toBe("123");
});
```

### Mock routing

- `mock.setResponse(default)` — fallback for all requests
- `mock.setResponseFor('/path-segment', response)` — URL substring match
- `mock.setResponseFor(/regex/, response)` — regex match
- Routes are checked in reverse insertion order (most recent first)

### Polling tests

Set `intervalMs: 0` on `waitForContainerReady` to avoid timer delays.

---

## 14. Meta platform pitfalls

| Symptom                                      | Likely cause                             | Fix                                                     |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `(#190) Invalid OAuth access token`          | User token instead of Page token         | `listConnectedAccounts()` → use Page `access_token`     |
| `(#100) Unsupported get request`             | Wrong ID type or missing permission      | Verify IG account ID and App Review scopes              |
| `(#10) Application does not have permission` | Missing scope or App Review              | Add scope to OAuth; submit for review                   |
| Publishing `ERROR` status                    | Media URL not publicly accessible        | Ensure HTTPS URL reachable by Meta servers              |
| Insight metric error                         | Deprecated or wrong media type           | Use `views`; check metric availability per product type |
| Webhook signature mismatch                   | Parsed JSON body used for HMAC           | Use raw body buffer/string                              |
| Rate limit 429                               | Too many requests                        | Use `error.retryAfterMs`; reduce concurrency            |
| Empty `listConnectedAccounts`                | No Page linked to IG account             | User must connect IG Business account to Facebook Page  |
| Messaging fails                              | Outside 24h window or missing permission | Check policy + `instagram_manage_messages` scope        |

---

## 15. Official Meta links

- [Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform)
- [Instagram API with Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/overview)
- [Business login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Instagram Login OAuth authorize](https://developers.facebook.com/docs/instagram-platform/reference/oauth-authorize)
- [Instagram Login refresh access token](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token)
- [Content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing)
- [Resumable uploads](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads)
- [IG Hashtag reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag)
- [IG User reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user)
- [IG Media insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights)
- [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)
- [Permissions reference](https://developers.facebook.com/docs/permissions/reference)
- [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog)
- [Instagram Platform changelog](https://developers.facebook.com/docs/instagram-platform/changelog)

---

## Version and semver

- Package version: `0.3.0`
- Exported constant: `VERSION`
- Follow semver: MAJOR = breaking public API, MINOR = backward-compatible features, PATCH = fixes
- Update `CHANGELOG.md` on releases
