/**
 * Insight metrics available on `GET /{ig-user-id}/insights`.
 *
 * Metric availability depends on `period`, `timeframe`, and `breakdown`.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights
 */
export type UserInsightMetric =
  | 'reach'
  | 'follower_count'
  | 'online_followers'
  | 'accounts_engaged'
  | 'total_interactions'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'replies'
  | 'views'
  | 'reposts'
  | 'profile_links_taps'
  | 'follows'
  | 'demographics';

/**
 * Deprecated user insight metrics.
 *
 * Meta deprecated several metrics starting with Graph API v21 and removed them
 * for all versions on April 21, 2025. Prefer current replacements where noted.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/changelog
 */
export type DeprecatedUserInsightMetric =
  | 'impressions'
  | 'profile_views'
  | 'email_contacts'
  | 'phone_call_clicks'
  | 'text_message_clicks'
  | 'get_directions_clicks'
  | 'website_clicks';

/**
 * Insight metrics available on `GET /{ig-media-id}/insights`.
 *
 * Availability varies by media product type (`FEED`, `REELS`, `STORY`).
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights
 */
export type MediaInsightMetric =
  | 'reach'
  | 'views'
  | 'likes'
  | 'comments'
  | 'saved'
  | 'shares'
  | 'total_interactions'
  | 'follows'
  | 'profile_activity'
  | 'profile_visits'
  | 'navigation'
  | 'replies'
  | 'reposts'
  | 'crossposted_views'
  | 'facebook_views'
  | 'ig_reels_avg_watch_time'
  | 'ig_reels_video_view_total_time'
  | 'reels_skip_rate'
  | 'total_comments'
  | 'total_likes';

/**
 * Deprecated media insight metrics.
 *
 * Prefer `views` instead of `impressions`, `plays`, and related play-count metrics.
 */
export type DeprecatedMediaInsightMetric =
  | 'impressions'
  | 'plays'
  | 'clips_replays_count'
  | 'ig_reels_aggregated_all_plays_count'
  | 'video_views';

/** Union of all supported insight metric names across user and media endpoints. */
export type InsightMetric = UserInsightMetric | MediaInsightMetric | DeprecatedUserInsightMetric | DeprecatedMediaInsightMetric;

/**
 * Insight period accepted by Graph API user insights.
 */
export type InsightPeriod = 'day' | 'week' | 'days_28' | 'lifetime';

/**
 * Timeframe accepted by Graph API user insights.
 */
export type InsightTimeframe =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'day_7'
  | 'day_28'
  | 'day_90'
  | 'day_180'
  | 'day_365'
  | 'lifetime';

/**
 * Breakdown dimension for user insight queries.
 */
export type UserInsightBreakdown = 'contact_button_type' | 'follow_type' | 'media_product_type';

/**
 * Breakdown dimension for legacy demographic insight queries.
 */
export type DemographicInsightBreakdown = 'country' | 'city' | 'age' | 'gender';

/**
 * Aggregation mode for insight responses.
 */
export type InsightMetricType = 'total_value' | 'average';

/**
 * Single insight metric value returned by Graph API.
 */
export interface InsightValue {
  /** Metric value. May be numeric or string depending on metric type. */
  value: number | string;
  /** Optional end time for time-series metrics. */
  end_time?: string;
}

/**
 * Insight metric payload grouped by metric name.
 */
export interface InsightMetricResult {
  /** Metric name. */
  name: InsightMetric | string;
  /** Metric title for display. */
  title?: string;
  /** Metric description. */
  description?: string;
  /** Aggregation period. */
  period?: InsightPeriod;
  /** Series of values for the metric. */
  values: InsightValue[];
  /** Total value when Graph API returns an aggregate. */
  total_value?: {
    value: number;
  };
}

/**
 * Graph API insights response envelope.
 */
export interface InsightsResponse {
  /** Insight metric results. */
  data: InsightMetricResult[];
}

/**
 * Options for {@link InsightsResource.getUserInsights}.
 */
export interface UserInsightsOptions {
  /** Metrics to retrieve. */
  metrics: UserInsightMetric[];
  /** Aggregation period. Defaults to `day`. */
  period?: InsightPeriod;
  /** Lookback window required for some metrics. */
  timeframe?: InsightTimeframe;
  /** Breakdown dimension for supported metrics. */
  breakdown?: UserInsightBreakdown;
  /** Aggregation mode for supported metrics. */
  metricType?: InsightMetricType;
  /** Unix timestamp indicating the start of the range. */
  since?: number;
  /** Unix timestamp indicating the end of the range. */
  until?: number;
}

/**
 * Options for {@link InsightsResource.getMediaInsights}.
 */
export interface MediaInsightsOptions {
  /** Metrics to retrieve for a media object. */
  metrics: MediaInsightMetric[];
}
