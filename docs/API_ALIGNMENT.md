# Instagram Graph API Alignment

This document maps `@binary-black-holes/instagram-api` to Meta's official [Instagram Platform](https://developers.facebook.com/docs/instagram-platform) documentation and records deliberate SDK choices.

For AI agent integration guidance, see [AGENTS.md](../AGENTS.md) and [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md).

## Platform scope

| Topic         | SDK coverage                                                                            | Meta documentation                                                                                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API product   | Instagram API with Facebook Login and Instagram API with Instagram Login                | [Facebook Login overview](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/overview), [Instagram Login business login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login) |
| Account types | Instagram Business and Creator accounts; Facebook Login requires a linked Facebook Page | [Business login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram)                                                                                                                     |
| Not supported | Instagram Basic Display API and private/unofficial Instagram APIs                       | [Basic Display](https://developers.facebook.com/docs/instagram-basic-display-api)                                                                                                                                                                                          |

## Authentication and tokens

### Facebook Login token flow

Meta's documented Facebook Login setup flow is:

1. Redirect the user through Facebook OAuth.
2. Exchange the authorization code for a user access token.
3. Call `GET /me/accounts` with the user token.
4. Read the Page `access_token` and `instagram_business_account.id`.
5. Use those values to construct `InstagramClient`.

SDK mapping:

| Meta step           | SDK method                                             |
| ------------------- | ------------------------------------------------------ |
| OAuth dialog        | `OAuthProvider.getAuthorizationUrl()`                  |
| Code exchange       | `OAuthProvider.exchangeCodeForToken()`                 |
| Long-lived token    | `OAuthProvider.exchangeForLongLivedToken()`            |
| Account discovery   | `OAuthProvider.listConnectedAccounts(userAccessToken)` |
| Token introspection | `OAuthProvider.debugToken()`                           |
| Graph API calls     | `InstagramClient` with Page access token + IG user ID  |

### Instagram Login token flow

Meta's documented Instagram Login setup flow is:

1. Redirect the user through Instagram OAuth.
2. Exchange the authorization code at `POST https://api.instagram.com/oauth/access_token`.
3. Exchange the short-lived Instagram User token at `GET https://graph.instagram.com/access_token`.
4. Refresh long-lived Instagram User tokens at `GET https://graph.instagram.com/refresh_access_token`.
5. Construct `InstagramClient` with `loginType: 'instagram'` and the Instagram User access token.

SDK mapping:

| Meta step        | SDK method                                                        |
| ---------------- | ----------------------------------------------------------------- |
| OAuth dialog     | `OAuthProvider({ loginType: 'instagram' }).getAuthorizationUrl()` |
| Code exchange    | `OAuthProvider.exchangeCodeForToken()`                            |
| Long-lived token | `OAuthProvider.exchangeForLongLivedToken()`                       |
| Token refresh    | `OAuthProvider.refreshLongLivedToken()`                           |
| Graph API calls  | `InstagramClient({ loginType: 'instagram', accessToken })`        |

### OAuth scopes

Meta currently documents multiple permission families:

| Use case                        | Meta permissions                                                                                                                                     | SDK constant                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Legacy Facebook Login apps      | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` | `DEFAULT_OAUTH_SCOPES`                    |
| Current business permission set | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, plus page/insights scopes                    | `DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES` |
| Instagram Login                 | `instagram_business_basic` plus optional feature scopes                                                                                              | `DEFAULT_INSTAGRAM_LOGIN_SCOPES`          |

Reference: [Permissions reference](https://developers.facebook.com/docs/permissions/reference)

For Facebook Login, `InstagramClient` expects a **Page access token** with the permissions required by the endpoints you call. Passing a raw user token will fail for most Facebook Login Graph API operations.

For Instagram Login, `InstagramClient` expects an **Instagram User access token** and uses `/me` by default when no `instagramAccountId` is supplied.

## Base URLs and versioning

| Constant                       | Value                          | Meta equivalent                    |
| ------------------------------ | ------------------------------ | ---------------------------------- |
| `GRAPH_API_BASE_URL`           | `https://graph.facebook.com`   | Graph API host                     |
| `OAUTH_DIALOG_URL`             | `https://www.facebook.com`     | Facebook Login dialog              |
| `INSTAGRAM_GRAPH_API_BASE_URL` | `https://graph.instagram.com`  | Instagram Login Graph API host     |
| `INSTAGRAM_OAUTH_DIALOG_URL`   | `https://api.instagram.com`    | Instagram Login OAuth dialog host  |
| `INSTAGRAM_OAUTH_API_BASE_URL` | `https://api.instagram.com`    | Instagram Login code exchange host |
| `RUPLOAD_BASE_URL`             | `https://rupload.facebook.com` | Resumable video upload host        |
| Default version                | `v21.0`                        | Configurable via `apiVersion`      |

Supported typed versions: `v19.0` through `v25.0`.

Facebook Login Graph API requests resolve to:

```text
https://graph.facebook.com/{apiVersion}/{path}?access_token=...&...
```

Instagram Login Graph API requests resolve to:

```text
https://graph.instagram.com/{apiVersion}/{path}?access_token=...&...
```

Resumable uploads resolve to:

```text
https://rupload.facebook.com/ig-api-upload/{apiVersion}/{container-id}
```

POST operations generally send parameters in the query string, matching Meta's published curl examples. JSON request bodies are used where Meta documents JSON payloads (`/replies`, `/messages`).

## Endpoint mapping

### Users

| SDK method                        | Meta endpoint                                                    | Notes                                      |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| `client.users.getProfile()`       | `GET /{ig-user-id}?fields=...` or `GET /me?fields=...`           | Aligned; Instagram Login defaults to `/me` |
| `client.users.listMedia()`        | `GET /{ig-user-id}/media` or `GET /me/media`                     | Aligned                                    |
| `client.users.listAllMedia()`     | Paginated `GET /{ig-user-id}/media`                              | SDK helper                                 |
| `client.users.discoverBusiness()` | `GET /{ig-user-id}?fields=business_discovery.username(...){...}` | Facebook Login only                        |

Reference: [IG User](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user), [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery)

### Media and publishing

| SDK method                                      | Meta endpoint                                      | Notes                                                          |
| ----------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `client.media.getById()`                        | `GET /{ig-media-id}`                               | Aligned                                                        |
| `client.media.listComments()`                   | `GET /{ig-media-id}/comments`                      | Aligned                                                        |
| `client.media.createImageContainer()`           | `POST /{ig-user-id}/media`                         | `image_url`, `caption`, `alt_text`, `location_id`, `user_tags` |
| `client.media.createVideoContainer()`           | `POST /{ig-user-id}/media`                         | `video_url`, `media_type=VIDEO\|REELS\|STORIES`                |
| `client.media.createStoryContainer()`           | `POST /{ig-user-id}/media`                         | `media_type=STORIES`                                           |
| `client.media.createCarouselItemContainer()`    | `POST /{ig-user-id}/media`                         | `is_carousel_item=true`                                        |
| `client.media.createCarouselContainer()`        | `POST /{ig-user-id}/media`                         | `media_type=CAROUSEL`, `children`                              |
| `client.media.createResumableUploadSession()`   | `POST /{ig-user-id}/media`                         | `upload_type=resumable`                                        |
| `client.media.uploadResumableVideo()`           | `POST rupload.facebook.com/ig-api-upload/...`      | Binary upload                                                  |
| `client.media.getContainerStatus()`             | `GET /{ig-container-id}?fields=status_code`        | Poll until `FINISHED`                                          |
| `client.media.publish()`                        | `POST /{ig-user-id}/media_publish?creation_id=...` | Aligned                                                        |
| `client.media.publishWhenReady()`               | quota check + poll + publish                       | SDK helper                                                     |
| `client.media.assertPublishingQuotaAvailable()` | `GET /{ig-user-id}/content_publishing_limit`       | Throws when quota exhausted                                    |
| `client.media.replyToComment()`                 | `POST /{ig-comment-id}/replies`                    | JSON body `{ message }`                                        |
| `client.media.deleteComment()`                  | `DELETE /{ig-comment-id}`                          | Aligned                                                        |
| `client.media.setCommentHidden()`               | `POST /{ig-comment-id}?hide=...`                   | Aligned                                                        |

Reference: [Content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing), [Resumable uploads](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads), [Comment moderation](https://developers.facebook.com/docs/instagram-platform/comment-moderation)

Publishing flows:

```text
Standard: create*Container() -> waitForContainerReady() -> publish()
One-shot: publishWhenReady({ enforceQuota: true })
Carousel: createCarouselItemContainer()* -> createCarouselContainer() -> publishWhenReady()
Resumable: createResumableUploadSession() -> uploadResumableVideo() -> publishWhenReady()
```

### Hashtags

| SDK method                          | Meta endpoint                                            | Notes                                            |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| `client.hashtags.search()`          | `GET /ig_hashtag_search?user_id={ig-user-id}&q=...`      | Facebook Login only; strips optional leading `#` |
| `client.hashtags.getById()`         | `GET /{ig-hashtag-id}?fields=...`                        | Facebook Login only                              |
| `client.hashtags.listRecentMedia()` | `GET /{ig-hashtag-id}/recent_media?user_id={ig-user-id}` | Facebook Login only; paginated                   |
| `client.hashtags.listTopMedia()`    | `GET /{ig-hashtag-id}/top_media?user_id={ig-user-id}`    | Facebook Login only; paginated                   |

Reference: [IG Hashtag](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag), [Hashtag search](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search)

Hashtag media endpoints require Instagram Public Content Access and are subject to Meta's hashtag query limits.

### Webhook server helpers

| SDK helper                      | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `verifyWebhookChallenge()`      | Validates Meta webhook setup GET requests        |
| `verifyWebhookSignature()`      | Validates `X-Hub-Signature-256` on POST payloads |
| `parseWebhookPayload()`         | Parses webhook JSON payloads                     |
| `parseVerifiedWebhookPayload()` | Verifies signature then parses payload           |

Reference: [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)

### HTTP observability

Pass `hooks` to `InstagramClient` for request/response lifecycle callbacks:

```ts
const client = new InstagramClient({
  accessToken: "...",
  instagramAccountId: "...",
  hooks: {
    onRequest: ({ method, path }) => logger.debug("request", { method, path }),
    onResponse: ({ path, status, durationMs }) =>
      logger.info("response", { path, status, durationMs }),
    onError: ({ path, error, durationMs }) =>
      logger.error("error", { path, error, durationMs }),
  },
});
```

### Commerce

| SDK method                                | Meta endpoint                                 | Notes                                       |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| `client.commerce.listAvailableCatalogs()` | `GET /{ig-user-id}?fields=available_catalogs` | Facebook Login only                         |
| `client.commerce.searchCatalogProducts()` | `GET /{ig-user-id}/catalog_product_search`    | Facebook Login only; requires `catalog_id`  |
| `client.commerce.listProductTags()`       | `GET /{ig-media-id}/product_tags`             | Facebook Login only                         |
| `client.commerce.updateProductTags()`     | `POST /{ig-media-id}/product_tags`            | Facebook Login only; `updated_tags` payload |

Reference: [Product tagging](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/product-tagging)

### Messaging

| SDK method                            | Meta endpoint                 | Notes                                              |
| ------------------------------------- | ----------------------------- | -------------------------------------------------- |
| `client.messaging.sendTextMessage()`  | `POST /{ig-user-id}/messages` | `{ recipient: { id }, message: { text } }`         |
| `client.messaging.sendMediaShare()`   | `POST /{ig-user-id}/messages` | `attachment.type=MEDIA_SHARE`                      |
| `client.messaging.sendPrivateReply()` | `POST /{ig-user-id}/messages` | `{ recipient: { comment_id }, message: { text } }` |

Reference: [Messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api), [Private replies](https://developers.facebook.com/docs/instagram-platform/private-replies)

Requires `instagram_manage_messages` or `instagram_business_manage_messages` depending on app configuration.

### Webhooks

| SDK method                            | Meta endpoint                          | Notes                               |
| ------------------------------------- | -------------------------------------- | ----------------------------------- |
| `client.webhooks.subscribe()`         | `POST /{ig-user-id}/subscribed_apps`   | `subscribed_fields` comma-separated |
| `client.webhooks.unsubscribe()`       | `DELETE /{ig-user-id}/subscribed_apps` | Aligned                             |
| `client.webhooks.listSubscriptions()` | `GET /{ig-user-id}/subscribed_apps`    | Aligned                             |

Reference: [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)

Webhook delivery still requires configuring the callback URL and verify token in the Meta developer dashboard. The SDK manages Graph API subscription state only.

### Insights

| SDK method                           | Meta endpoint                 | Notes                                                                         |
| ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------- |
| `client.insights.getUserInsights()`  | `GET /{ig-user-id}/insights`  | `metric`, `period`, `timeframe`, `breakdown`, `metric_type`, `since`, `until` |
| `client.insights.getMediaInsights()` | `GET /{ig-media-id}/insights` | `metric`                                                                      |

Reference: [IG User insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights), [IG Media insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights)

Deprecated metrics are typed separately. Prefer `views` over `impressions` for media insights on Graph API v22+.

## Deliberate SDK choices

| Choice                                          | Reason                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| POST params sent as query string for publishing | Matches Meta's published curl examples              |
| JSON POST bodies for replies/messages           | Matches Meta's messaging and comment reply docs     |
| `access_token` in query params for Graph API    | Standard Graph API behavior                         |
| Separate resumable upload host                  | Meta uses `rupload.facebook.com` for binary uploads |
| Class/resource architecture                     | Mirrors Graph API resource groups                   |

## Remaining platform responsibilities

These are Meta platform concerns outside the SDK's Graph API client scope:

| Responsibility                               | Owner                    |
| -------------------------------------------- | ------------------------ |
| Webhook HTTP route wiring in your app server | Your application         |
| App Review and permission approval           | Meta developer dashboard |
| Catalog/product setup in Commerce Manager    | Meta Business Suite      |
| 24-hour messaging window policy enforcement  | Your application         |

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
