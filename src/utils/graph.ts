/**
 * Builds the Graph API `fields` value for business discovery queries.
 *
 * @param username - Target Instagram username without `@`.
 * @param fields - Nested fields to request inside business discovery.
 * @returns Graph API field expression.
 */
export function buildBusinessDiscoveryFields(
  username: string,
  fields: string[] = ['id', 'username', 'followers_count', 'media_count'],
): string {
  return `business_discovery.username(${username}){${fields.join(',')}}`;
}

/**
 * Serializes carousel child container IDs for Graph API requests.
 *
 * @param children - Container IDs created with `is_carousel_item=true`.
 * @returns Comma-separated container ID list.
 */
export function serializeCarouselChildren(children: string[]): string {
  return children.join(',');
}

/**
 * Serializes product tags for Graph API publishing requests.
 */
export function serializeProductTags(
  tags: Array<{ productId: string | number; x?: number; y?: number }>,
): string {
  return JSON.stringify(
    tags.map((tag) => ({
      product_id: tag.productId,
      ...(tag.x !== undefined ? { x: tag.x } : {}),
      ...(tag.y !== undefined ? { y: tag.y } : {}),
    })),
  );
}

/**
 * Serializes updated product tags for existing media updates.
 */
export function serializeUpdatedProductTags(
  tags: Array<{ productId: string | number; x?: number; y?: number }>,
): string {
  return serializeProductTags(tags).replace(/product_id/g, 'product_id');
}
