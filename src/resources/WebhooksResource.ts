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
   * Subscribes the app to Instagram webhook fields for the configured account.
   *
   * Graph API: `POST /{ig-user-id}/subscribed_apps`
   */
  async subscribe(options: SubscribeWebhooksOptions): Promise<WebhookSubscriptionResponse> {
    if (!options.fields.length) {
      throw new ValidationError('At least one webhook field must be provided.');
    }

    const accountId = this.resolveAccountId();
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
   * Graph API: `DELETE /{ig-user-id}/subscribed_apps`
   */
  async unsubscribe(): Promise<WebhookSubscriptionResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<WebhookSubscriptionResponse>({
      path: `/${accountId}/subscribed_apps`,
      method: 'DELETE',
    });

    return response.data;
  }

  /**
   * Lists active webhook subscriptions for the configured account.
   *
   * Graph API: `GET /{ig-user-id}/subscribed_apps`
   */
  async listSubscriptions(): Promise<SubscribedAppsResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<SubscribedAppsResponse>({
      path: `/${accountId}/subscribed_apps`,
    });

    return response.data;
  }
}
