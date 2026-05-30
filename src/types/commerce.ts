import type { PaginationOptions } from './common.js';

/**
 * Product catalog available to an Instagram professional account.
 */
export interface InstagramCatalog {
  /** Catalog ID. */
  id: string;
  /** Catalog display name. */
  name?: string;
}

/**
 * Product eligible for tagging in Instagram media.
 */
export interface CatalogProduct {
  product_id: string | number;
  merchant_id?: string | number;
  product_name?: string;
  name?: string;
  image_url?: string;
  retailer_id?: string;
  review_status?: 'approved' | 'outdated' | 'pending' | 'rejected' | '';
  is_checkout_flow?: boolean;
  product_variants?: Array<{ product_id: string | number; variant_name?: string }>;
}

/**
 * Product tag attached to published or draft media.
 */
export interface ProductTag {
  product_id: string | number;
  merchant_id?: string | number;
  name?: string;
  price_string?: string;
  image_url?: string;
  review_status?: string;
  is_checkout?: boolean;
  x?: number;
  y?: number;
}

/**
 * Input for creating/updating a product tag on media.
 */
export interface ProductTagInput {
  productId: string | number;
  /** Required for image tags. Value between 0.0 and 1.0. */
  x?: number;
  /** Required for image tags. Value between 0.0 and 1.0. */
  y?: number;
}

/**
 * Response from available catalogs lookup.
 */
export interface AvailableCatalogsResponse {
  available_catalogs?: {
    data: InstagramCatalog[];
  };
}

/**
 * Response from catalog product search.
 */
export interface CatalogProductSearchResponse {
  data: CatalogProduct[];
}

/**
 * Response from product tag listing.
 */
export interface ProductTagsResponse {
  data: ProductTag[];
}

/**
 * Options for {@link CommerceResource.searchCatalogProducts}.
 */
export interface CatalogProductSearchOptions extends PaginationOptions {
  /** Catalog ID to search within. */
  catalogId: string;
  /** Optional search query for product name or SKU. */
  query?: string;
}
