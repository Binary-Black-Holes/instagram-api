import type { HttpClient } from '../http/HttpClient.js';
import { ValidationError } from '../errors/index.js';
import type { LoginType } from '../types/common.js';

/**
 * Base class for Graph API resource modules.
 *
 * Resource classes encapsulate endpoint-specific behavior while sharing the
 * same authenticated HTTP transport and account context.
 */
export abstract class BaseResource {
  /**
   * @param http - Shared HTTP client instance.
   * @param accountId - Instagram Business/Creator account ID.
   */
  constructor(
    protected readonly http: HttpClient,
    protected accountId: string,
  ) {}

  /**
   * Updates the Instagram account ID used by this resource.
   *
   * @param accountId - New account ID.
   */
  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  /**
   * Resolves the effective Instagram account ID for API calls.
   *
   * @param override - Optional per-request account ID override.
   * @returns Account ID used for the operation.
   */
  protected resolveAccountId(override?: string): string {
    return override ?? this.accountId;
  }

  /**
   * Returns the configured Meta login product for this resource.
   */
  protected getLoginType(): LoginType {
    return this.http.getLoginType();
  }

  /**
   * Prevents accidental calls to endpoints Meta documents as Facebook Login-only.
   */
  protected assertFacebookLoginOnly(resourceName: string): void {
    if (this.getLoginType() === 'instagram') {
      throw new ValidationError(`${resourceName} is only available with Instagram API using Facebook Login.`);
    }
  }
}
