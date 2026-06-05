import type {
  SubscribeWebhooksOptions,
  SubscribedAppsResponse,
  WebhookSubscriptionResponse,
} from '../types/webhooks.js';
import { ValidationError } from '../errors/index.js';
import { BaseResource } from './BaseResource.js';

/**
 * Instagram webhook subscription resource.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/webhooks
 */
export class WebhooksResource extends BaseResource {
  /**
   * Resolves the account ID segment for webhook subscription endpoints.
   *
   * Instagram Login tokens must target `/me/subscribed_apps`; the OAuth
   * `user_id` is not valid as a path segment for this edge.
   */
  private resolveWebhookAccountId(): string {
    if (this.getLoginType() === 'instagram') {
      return 'me';
    }

    return this.resolveAccountId();
  }

  /**
   * Subscribes the app to Instagram webhook fields for the configured account.
   *
   * Instagram Login: `POST /me/subscribed_apps` on graph.instagram.com
   * Facebook Login: `POST /{ig-user-id}/subscribed_apps` on graph.facebook.com
   */
  async subscribe(options: SubscribeWebhooksOptions): Promise<WebhookSubscriptionResponse> {
    if (!options.fields.length) {
      throw new ValidationError('At least one webhook field must be provided.');
    }

    const accountId = this.resolveWebhookAccountId();
    const response = await this.http.request<WebhookSubscriptionResponse>({
      path: `/${accountId}/subscribed_apps`,
      method: 'POST',
      params: {
        subscribed_fields: options.fields.join(','),
      },
    });

    return response.data;
  }

  /**
   * Unsubscribes the app from Instagram webhook notifications.
   *
   * Instagram Login: `DELETE /me/subscribed_apps` on graph.instagram.com
   * Facebook Login: `DELETE /{ig-user-id}/subscribed_apps` on graph.facebook.com
   */
  async unsubscribe(): Promise<WebhookSubscriptionResponse> {
    const accountId = this.resolveWebhookAccountId();
    const response = await this.http.request<WebhookSubscriptionResponse>({
      path: `/${accountId}/subscribed_apps`,
      method: 'DELETE',
    });

    return response.data;
  }

  /**
   * Lists active webhook subscriptions for the configured account.
   *
   * Instagram Login: `GET /me/subscribed_apps` on graph.instagram.com
   * Facebook Login: `GET /{ig-user-id}/subscribed_apps` on graph.facebook.com
   */
  async listSubscriptions(): Promise<SubscribedAppsResponse> {
    const accountId = this.resolveWebhookAccountId();
    const response = await this.http.request<SubscribedAppsResponse>({
      path: `/${accountId}/subscribed_apps`,
    });

    return response.data;
  }
}
