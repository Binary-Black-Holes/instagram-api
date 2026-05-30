import type { UserInsightsOptions, MediaInsightsOptions, InsightsResponse } from '../types/insights.js';
import { ValidationError } from '../errors/index.js';
import { BaseResource } from './BaseResource.js';

/**
 * Instagram insights and analytics resource.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights
 */
export class InsightsResource extends BaseResource {
  /**
   * Retrieves account-level insights for the configured Instagram user.
   *
   * Graph API: `GET /{ig-user-id}/insights`
   */
  async getUserInsights(options: UserInsightsOptions): Promise<InsightsResponse> {
    if (!options.metrics.length) {
      throw new ValidationError('At least one insight metric must be provided.');
    }

    const accountId = this.resolveAccountId();
    const response = await this.http.request<InsightsResponse>({
      path: `/${accountId}/insights`,
      params: {
        metric: options.metrics.join(','),
        period: options.period ?? 'day',
        timeframe: options.timeframe,
        breakdown: options.breakdown,
        metric_type: options.metricType,
        since: options.since,
        until: options.until,
      },
    });

    return response.data;
  }

  /**
   * Retrieves media-level insights for a specific media object.
   *
   * Graph API: `GET /{ig-media-id}/insights`
   */
  async getMediaInsights(mediaId: string, options: MediaInsightsOptions): Promise<InsightsResponse> {
    if (!mediaId.trim()) {
      throw new ValidationError('mediaId must be a non-empty string.');
    }

    if (!options.metrics.length) {
      throw new ValidationError('At least one insight metric must be provided.');
    }

    const response = await this.http.request<InsightsResponse>({
      path: `/${mediaId}/insights`,
      params: {
        metric: options.metrics.join(','),
      },
    });

    return response.data;
  }
}
