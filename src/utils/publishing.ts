import type { ContentPublishingLimitResponse } from '../types/account.js';
import type { PublishingQuotaSummary } from '../types/media.js';

/**
 * Extracts a normalized publishing quota summary from Graph API response data.
 */
export function extractPublishingQuota(
  response: ContentPublishingLimitResponse,
): PublishingQuotaSummary {
  const entry = response.data[0];
  const usage = entry?.quota_usage ?? 0;
  const total = entry?.config?.quota_total ?? 0;
  const summary: PublishingQuotaSummary = {
    usage,
    total,
    remaining: Math.max(total - usage, 0),
  };

  if (entry?.config?.quota_duration !== undefined) {
    summary.durationSeconds = entry.config.quota_duration;
  }

  return summary;
}
