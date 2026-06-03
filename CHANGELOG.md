# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-03

### Added

- Added opt-in Instagram Login support via `loginType: "instagram"` for OAuth and Graph API clients
- Added Instagram Login token exchange and refresh endpoints for `api.instagram.com` and `graph.instagram.com`
- Added hashtag search/media resource coverage for Instagram API with Facebook Login
- Added runtime guards for Facebook Login-only resources when using Instagram Login mode

## [0.1.2] - 2026-05-30

### Changed

- Replaced internal query serialization in `buildQueryString()` with `query-string` for standardized encoding behavior
- Added `query-string` as a runtime dependency while preserving omission of `undefined` query params

## [0.1.1] - 2026-05-30

### Added

- `AGENTS.md` — primary AI agent entry point with scope, constraints, decision trees, and anti-patterns
- `docs/AI_AGENT_GUIDE.md` — comprehensive method catalog, workflows, type reference, and test patterns for AI agents
- `.cursor/rules/instagram-api-agents.mdc` — always-on Cursor rule pointing agents to the documentation

### Changed

- README links to AI agent documentation
- `docs/API_ALIGNMENT.md` cross-links to agent guides
- npm package `files` manifest now includes `AGENTS.md`

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

[0.2.0]: https://github.com/Binary-Black-Holes/instagram-api/releases/tag/v0.2.0
[0.1.2]: https://github.com/Binary-Black-Holes/instagram-api/releases/tag/v0.1.2
[0.1.1]: https://github.com/Binary-Black-Holes/instagram-api/releases/tag/v0.1.1
[0.1.0]: https://github.com/Binary-Black-Holes/instagram-api/releases/tag/v0.1.0
