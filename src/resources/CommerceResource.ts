import type {
  AvailableCatalogsResponse,
  CatalogProductSearchOptions,
  CatalogProductSearchResponse,
  ProductTagInput,
  ProductTagsResponse,
} from '../types/commerce.js';
import { ValidationError } from '../errors/index.js';
import { serializeProductTags } from '../utils/graph.js';
import { BaseResource } from './BaseResource.js';

/**
 * Instagram shopping and product tagging resource.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/product-tagging
 */
export class CommerceResource extends BaseResource {
  /**
   * Lists product catalogs available to the configured Instagram account.
   *
   * Graph API: `GET /{ig-user-id}?fields=available_catalogs`
   */
  async listAvailableCatalogs(): Promise<AvailableCatalogsResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<AvailableCatalogsResponse>({
      path: `/${accountId}`,
      params: {
        fields: 'available_catalogs',
      },
    });

    return response.data;
  }

  /**
   * Searches products eligible for tagging within a catalog.
   *
   * Graph API: `GET /{ig-user-id}/catalog_product_search`
   */
  async searchCatalogProducts(
    options: CatalogProductSearchOptions,
  ): Promise<CatalogProductSearchResponse> {
    if (!options.catalogId.trim()) {
      throw new ValidationError('catalogId must be a non-empty string.');
    }

    const accountId = this.resolveAccountId();
    const response = await this.http.request<CatalogProductSearchResponse>({
      path: `/${accountId}/catalog_product_search`,
      params: {
        catalog_id: options.catalogId,
        q: options.query,
        limit: options.limit,
        after: options.after,
        before: options.before,
      },
    });

    return response.data;
  }

  /**
   * Lists product tags attached to a media object.
   *
   * Graph API: `GET /{ig-media-id}/product_tags`
   */
  async listProductTags(mediaId: string): Promise<ProductTagsResponse> {
    if (!mediaId.trim()) {
      throw new ValidationError('mediaId must be a non-empty string.');
    }

    const response = await this.http.request<ProductTagsResponse>({
      path: `/${mediaId}/product_tags`,
    });

    return response.data;
  }

  /**
   * Creates or updates product tags on existing media.
   *
   * Graph API: `POST /{ig-media-id}/product_tags`
   */
  async updateProductTags(mediaId: string, tags: ProductTagInput[]): Promise<{ success: boolean }> {
    if (!mediaId.trim()) {
      throw new ValidationError('mediaId must be a non-empty string.');
    }

    if (!tags.length) {
      throw new ValidationError('At least one product tag must be provided.');
    }

    const response = await this.http.request<{ success: boolean }>({
      path: `/${mediaId}/product_tags`,
      method: 'POST',
      params: {
        updated_tags: serializeProductTags(
          tags.map((tag) => ({
            productId: tag.productId,
            ...(tag.x !== undefined ? { x: tag.x } : {}),
            ...(tag.y !== undefined ? { y: tag.y } : {}),
          })),
        ),
      },
    });

    return response.data;
  }
}
