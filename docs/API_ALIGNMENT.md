# Instagram Graph API Alignment

This document maps `@binary-black-holes/instagram-api` to Meta's official [Instagram Platform](https://developers.facebook.com/docs/instagram-platform) documentation and records deliberate SDK choices.

## Platform scope

| Topic | SDK coverage | Meta documentation |
| --- | --- | --- |
| API product | Instagram Graph API with Facebook Login | [Overview](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/overview) |
| Account types | Instagram Business and Creator accounts linked to a Facebook Page | [Business login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram) |
| Not supported | Instagram Basic Display API, Instagram Login-only product | [Basic Display](https://developers.facebook.com/docs/instagram-basic-display-api) |

## Authentication and tokens

### Expected token flow

Meta's documented setup flow is:

1. Redirect the user through Facebook OAuth.
2. Exchange the authorization code for a user access token.
3. Call `GET /me/accounts` with the user token.
4. Read the Page `access_token` and `instagram_business_account.id`.
5. Use those values to construct `InstagramClient`.

SDK mapping:

| Meta step | SDK method |
| --- | --- |
| OAuth dialog | `OAuthProvider.getAuthorizationUrl()` |
| Code exchange | `OAuthProvider.exchangeCodeForToken()` |
| Long-lived token | `OAuthProvider.exchangeForLongLivedToken()` |
| Account discovery | `OAuthProvider.listConnectedAccounts(userAccessToken)` |
| Token introspection | `OAuthProvider.debugToken()` |
| Graph API calls | `InstagramClient` with Page access token + IG user ID |

### OAuth scopes

Meta currently documents two permission families:

| Use case | Meta permissions | SDK constant |
| --- | --- | --- |
| Legacy Facebook Login apps | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` | `DEFAULT_OAUTH_SCOPES` |
| Current business permission set | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, plus page/insights scopes | `DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES` |

Reference: [Permissions reference](https://developers.facebook.com/docs/permissions/reference)

`InstagramClient` expects a **Page access token** with the permissions required by the endpoints you call. Passing a raw user token will fail for most Instagram operations.

## Base URLs and versioning

| Constant | Value | Meta equivalent |
| --- | --- | --- |
| `GRAPH_API_BASE_URL` | `https://graph.facebook.com` | Graph API host |
| `OAUTH_DIALOG_URL` | `https://www.facebook.com` | Facebook Login dialog |
| `RUPLOAD_BASE_URL` | `https://rupload.facebook.com` | Resumable video upload host |
| Default version | `v21.0` | Configurable via `apiVersion` |

Supported typed versions: `v19.0` through `v25.0`.

All SDK Graph API requests resolve to:

```text
https://graph.facebook.com/{apiVersion}/{path}?access_token=...&...
```

Resumable uploads resolve to:

```text
https://rupload.facebook.com/ig-api-upload/{apiVersion}/{container-id}
```

POST operations generally send parameters in the query string, matching Meta's published curl examples. JSON request bodies are used where Meta documents JSON payloads (`/replies`, `/messages`).

## Endpoint mapping

### Users

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.users.getProfile()` | `GET /{ig-user-id}?fields=...` | Aligned |
| `client.users.listMedia()` | `GET /{ig-user-id}/media` | Aligned |
| `client.users.listAllMedia()` | Paginated `GET /{ig-user-id}/media` | SDK helper |
| `client.users.discoverBusiness()` | `GET /{ig-user-id}?fields=business_discovery.username(...){...}` | Aligned |

Reference: [IG User](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user), [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery)

### Media and publishing

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.media.getById()` | `GET /{ig-media-id}` | Aligned |
| `client.media.listComments()` | `GET /{ig-media-id}/comments` | Aligned |
| `client.media.createImageContainer()` | `POST /{ig-user-id}/media` | `image_url`, `caption`, `alt_text`, `location_id`, `user_tags` |
| `client.media.createVideoContainer()` | `POST /{ig-user-id}/media` | `video_url`, `media_type=VIDEO|REELS|STORIES` |
| `client.media.createStoryContainer()` | `POST /{ig-user-id}/media` | `media_type=STORIES` |
| `client.media.createCarouselItemContainer()` | `POST /{ig-user-id}/media` | `is_carousel_item=true` |
| `client.media.createCarouselContainer()` | `POST /{ig-user-id}/media` | `media_type=CAROUSEL`, `children` |
| `client.media.createResumableUploadSession()` | `POST /{ig-user-id}/media` | `upload_type=resumable` |
| `client.media.uploadResumableVideo()` | `POST rupload.facebook.com/ig-api-upload/...` | Binary upload |
| `client.media.getContainerStatus()` | `GET /{ig-container-id}?fields=status_code` | Poll until `FINISHED` |
| `client.media.publish()` | `POST /{ig-user-id}/media_publish?creation_id=...` | Aligned |
| `client.media.publishWhenReady()` | quota check + poll + publish | SDK helper |
| `client.media.assertPublishingQuotaAvailable()` | `GET /{ig-user-id}/content_publishing_limit` | Throws when quota exhausted |
| `client.media.replyToComment()` | `POST /{ig-comment-id}/replies` | JSON body `{ message }` |
| `client.media.deleteComment()` | `DELETE /{ig-comment-id}` | Aligned |
| `client.media.setCommentHidden()` | `POST /{ig-comment-id}?hide=...` | Aligned |

Reference: [Content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing), [Resumable uploads](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads), [Comment moderation](https://developers.facebook.com/docs/instagram-platform/comment-moderation)

Publishing flows:

```text
Standard: create*Container() -> waitForContainerReady() -> publish()
One-shot: publishWhenReady({ enforceQuota: true })
Carousel: createCarouselItemContainer()* -> createCarouselContainer() -> publishWhenReady()
Resumable: createResumableUploadSession() -> uploadResumableVideo() -> publishWhenReady()
```

### Webhook server helpers

| SDK helper | Purpose |
| --- | --- |
| `verifyWebhookChallenge()` | Validates Meta webhook setup GET requests |
| `verifyWebhookSignature()` | Validates `X-Hub-Signature-256` on POST payloads |
| `parseWebhookPayload()` | Parses webhook JSON payloads |
| `parseVerifiedWebhookPayload()` | Verifies signature then parses payload |

Reference: [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)

### HTTP observability

Pass `hooks` to `InstagramClient` for request/response lifecycle callbacks:

```ts
const client = new InstagramClient({
  accessToken: '...',
  instagramAccountId: '...',
  hooks: {
    onRequest: ({ method, path }) => logger.debug('request', { method, path }),
    onResponse: ({ path, status, durationMs }) => logger.info('response', { path, status, durationMs }),
    onError: ({ path, error, durationMs }) => logger.error('error', { path, error, durationMs }),
  },
});
```

### Commerce

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.commerce.listAvailableCatalogs()` | `GET /{ig-user-id}?fields=available_catalogs` | Aligned |
| `client.commerce.searchCatalogProducts()` | `GET /{ig-user-id}/catalog_product_search` | Requires `catalog_id` |
| `client.commerce.listProductTags()` | `GET /{ig-media-id}/product_tags` | Aligned |
| `client.commerce.updateProductTags()` | `POST /{ig-media-id}/product_tags` | `updated_tags` payload |

Reference: [Product tagging](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/product-tagging)

### Messaging

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.messaging.sendTextMessage()` | `POST /{ig-user-id}/messages` | `{ recipient: { id }, message: { text } }` |
| `client.messaging.sendMediaShare()` | `POST /{ig-user-id}/messages` | `attachment.type=MEDIA_SHARE` |
| `client.messaging.sendPrivateReply()` | `POST /{ig-user-id}/messages` | `{ recipient: { comment_id }, message: { text } }` |

Reference: [Messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api), [Private replies](https://developers.facebook.com/docs/instagram-platform/private-replies)

Requires `instagram_manage_messages` or `instagram_business_manage_messages` depending on app configuration.

### Webhooks

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.webhooks.subscribe()` | `POST /{ig-user-id}/subscribed_apps` | `subscribed_fields` comma-separated |
| `client.webhooks.unsubscribe()` | `DELETE /{ig-user-id}/subscribed_apps` | Aligned |
| `client.webhooks.listSubscriptions()` | `GET /{ig-user-id}/subscribed_apps` | Aligned |

Reference: [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)

Webhook delivery still requires configuring the callback URL and verify token in the Meta developer dashboard. The SDK manages Graph API subscription state only.

### Insights

| SDK method | Meta endpoint | Notes |
| --- | --- | --- |
| `client.insights.getUserInsights()` | `GET /{ig-user-id}/insights` | `metric`, `period`, `timeframe`, `breakdown`, `metric_type`, `since`, `until` |
| `client.insights.getMediaInsights()` | `GET /{ig-media-id}/insights` | `metric` |

Reference: [IG User insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights), [IG Media insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights)

Deprecated metrics are typed separately. Prefer `views` over `impressions` for media insights on Graph API v22+.

## Deliberate SDK choices

| Choice | Reason |
| --- | --- |
| POST params sent as query string for publishing | Matches Meta's published curl examples |
| JSON POST bodies for replies/messages | Matches Meta's messaging and comment reply docs |
| `access_token` in query params for Graph API | Standard Graph API behavior |
| Separate resumable upload host | Meta uses `rupload.facebook.com` for binary uploads |
| Class/resource architecture | Mirrors Graph API resource groups |

## Remaining platform responsibilities

These are Meta platform concerns outside the SDK's Graph API client scope:

| Responsibility | Owner |
| --- | --- |
| Webhook HTTP route wiring in your app server | Your application |
| App Review and permission approval | Meta developer dashboard |
| Catalog/product setup in Commerce Manager | Meta Business Suite |
| 24-hour messaging window policy enforcement | Your application |

The SDK now provides webhook signature verification and challenge helpers, but you still host the endpoint itself.

## Verification checklist

Before production use, verify against your Meta app configuration:

- [ ] Required permissions are approved in App Review
- [ ] The Instagram account is a Business or Creator account linked to a Page
- [ ] You exchange the user token, then call `listConnectedAccounts()`
- [ ] `InstagramClient` uses the Page access token, not the user token
- [ ] Insight metrics match your API version and media product type
- [ ] Publishing requests respect the quota from `getContentPublishingLimit()`
- [ ] Webhook callback URL is configured in the Meta app dashboard
- [ ] Messaging features respect Instagram's 24-hour reply window rules

## Official references

- [Instagram Platform docs](https://developers.facebook.com/docs/instagram-platform)
- [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog)
- [Permissions reference](https://developers.facebook.com/docs/permissions/reference)
- [Content publishing guide](https://developers.facebook.com/docs/instagram-platform/content-publishing)
