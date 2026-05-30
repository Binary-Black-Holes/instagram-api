# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-30

### Added

- Initial release of `@binary-black-holes/instagram-api`
- `InstagramClient` with resource-oriented architecture: `users`, `media`, `insights`, `commerce`, `messaging`, and `webhooks`
- `OAuthProvider` for authorization URLs, token exchange, and connected account discovery
- Media publishing: image, video, reel, story, and carousel containers; resumable video upload; publishing quota checks
- Insights with user- and media-specific metric types
- Business discovery, commerce catalogs, messaging, and webhook subscription management
- Webhook helpers: signature verification, challenge verification, and payload parsing
- Publishing helpers: `waitForContainerReady`, `publishWhenReady`, and quota enforcement
- Axios-based HTTP transport with retries, timeouts, optional hooks, and typed error mapping
- ESM and CJS builds with TypeScript declarations and source maps

[0.1.0]: https://github.com/Binary-Black-Holes/instagram-api/releases/tag/v0.1.0
