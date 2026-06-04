import type { MediaResource } from '../resources/MediaResource.js';
import type { MessagingResource } from '../resources/MessagingResource.js';
import { CommentModerationUseCase } from './comment-moderation/index.js';
import { PrivateRepliesUseCase } from './private-replies/index.js';
import { SelfMessagingUseCase } from './self-messaging/index.js';

/**
 * Resource dependencies required to construct {@link InstagramUseCases}.
 */
export interface InstagramUseCasesDependencies {
  media: MediaResource;
  messaging: MessagingResource;
}

/**
 * Aggregates Instagram Platform use-case workflows and exposes them as a single
 * object merged onto {@link InstagramClient} as `client.useCases`.
 *
 * Each use case composes the lower-level resource methods into the end-to-end
 * flows documented by Meta:
 *
 * - {@link CommentModerationUseCase} — Comment Moderation
 * - {@link PrivateRepliesUseCase} — Private Replies
 * - {@link SelfMessagingUseCase} — Self Messaging
 *
 * Use cases hold references to the same resource instances owned by the client,
 * so account/token updates on the client are reflected automatically.
 */
export class InstagramUseCases {
  /** Comment moderation workflows (get/reply/hide/delete/toggle comments). */
  readonly commentModeration: CommentModerationUseCase;
  /** Private reply workflows for commenters. */
  readonly privateReplies: PrivateRepliesUseCase;
  /** Self messaging workflows and webhook detection helpers. */
  readonly selfMessaging: SelfMessagingUseCase;

  /**
   * @param deps - Shared resource instances from {@link InstagramClient}.
   */
  constructor(deps: InstagramUseCasesDependencies) {
    this.commentModeration = new CommentModerationUseCase(deps.media);
    this.privateReplies = new PrivateRepliesUseCase(deps.messaging);
    this.selfMessaging = new SelfMessagingUseCase(deps.messaging);
  }
}

export { CommentModerationUseCase } from './comment-moderation/index.js';
export type { ModeratedComment } from './comment-moderation/index.js';
export { PrivateRepliesUseCase } from './private-replies/index.js';
export { SelfMessagingUseCase } from './self-messaging/index.js';
