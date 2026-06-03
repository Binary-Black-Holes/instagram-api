import type {
  GetHashtagOptions,
  HashtagMediaOptions,
  HashtagMediaResponse,
  HashtagSearchResponse,
  InstagramHashtag,
} from '../types/hashtag.js';
import { ValidationError } from '../errors/index.js';
import { resolveFields } from '../utils/url.js';
import { BaseResource } from './BaseResource.js';

const DEFAULT_HASHTAG_FIELDS = ['id', 'name'] as const;
const DEFAULT_HASHTAG_MEDIA_FIELDS = [
  'id',
  'caption',
  'children{id,media_type,media_url}',
  'comments_count',
  'like_count',
  'media_type',
  'media_url',
  'permalink',
  'timestamp',
] as const;

/**
 * Instagram hashtag search and public hashtag media resource.
 *
 * Hashtag endpoints require Instagram API with Facebook Login and Meta's
 * Instagram Public Content Access feature.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag
 */
export class HashtagsResource extends BaseResource {
  /**
   * Searches for an IG Hashtag node ID by hashtag name.
   *
   * Graph API: `GET /ig_hashtag_search?user_id={ig-user-id}&q={hashtag}`
   */
  async search(hashtag: string): Promise<HashtagSearchResponse> {
    this.assertFacebookLoginOnly('Hashtag search');
    const query = this.normalizeHashtag(hashtag);
    const accountId = this.resolveAccountId();

    const response = await this.http.request<HashtagSearchResponse>({
      path: '/ig_hashtag_search',
      params: {
        user_id: accountId,
        q: query,
      },
    });

    return response.data;
  }

  /**
   * Reads an IG Hashtag node by ID.
   *
   * Graph API: `GET /{ig-hashtag-id}?fields=id,name`
   */
  async getById(hashtagId: string, options: GetHashtagOptions = {}): Promise<InstagramHashtag> {
    this.assertFacebookLoginOnly('IG Hashtag');
    this.assertNonEmptyId(hashtagId, 'hashtagId');

    const response = await this.http.request<InstagramHashtag>({
      path: `/${hashtagId}`,
      params: {
        fields: resolveFields(options.fields, [...DEFAULT_HASHTAG_FIELDS]),
      },
    });

    return response.data;
  }

  /**
   * Lists the most recently published public media tagged with a hashtag.
   *
   * Graph API: `GET /{ig-hashtag-id}/recent_media?user_id={ig-user-id}`
   */
  async listRecentMedia(
    hashtagId: string,
    options: HashtagMediaOptions = {},
  ): Promise<HashtagMediaResponse> {
    this.assertFacebookLoginOnly('Hashtag recent media');
    return this.listHashtagMedia(hashtagId, 'recent_media', options);
  }

  /**
   * Lists the most popular public media tagged with a hashtag.
   *
   * Graph API: `GET /{ig-hashtag-id}/top_media?user_id={ig-user-id}`
   */
  async listTopMedia(
    hashtagId: string,
    options: HashtagMediaOptions = {},
  ): Promise<HashtagMediaResponse> {
    this.assertFacebookLoginOnly('Hashtag top media');
    return this.listHashtagMedia(hashtagId, 'top_media', options);
  }

  private async listHashtagMedia(
    hashtagId: string,
    edge: 'recent_media' | 'top_media',
    options: HashtagMediaOptions,
  ): Promise<HashtagMediaResponse> {
    this.assertNonEmptyId(hashtagId, 'hashtagId');
    const accountId = this.resolveAccountId();

    const response = await this.http.request<HashtagMediaResponse>({
      path: `/${hashtagId}/${edge}`,
      params: {
        user_id: accountId,
        fields: resolveFields(options.fields, [...DEFAULT_HASHTAG_MEDIA_FIELDS]),
        limit: options.limit,
        after: options.after,
        before: options.before,
      },
    });

    return response.data;
  }

  private normalizeHashtag(value: string): string {
    const hashtag = value.trim().replace(/^#/, '');

    if (!hashtag) {
      throw new ValidationError('hashtag must be a non-empty string.');
    }

    return hashtag;
  }

  private assertNonEmptyId(value: string, fieldName: string): void {
    if (!value.trim()) {
      throw new ValidationError(`${fieldName} must be a non-empty string.`);
    }
  }
}
