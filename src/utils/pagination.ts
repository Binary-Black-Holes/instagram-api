import type { PaginatedResponse, PaginationOptions } from '../types/common.js';

/**
 * Async generator that iterates all pages of a cursor-based Graph API resource.
 *
 * @typeParam T - Item type contained in each page.
 * @param fetchPage - Function that retrieves a single page using pagination options.
 * @param initialOptions - Initial pagination options.
 * @yields Individual items across all pages.
 */
export async function* iteratePages<T>(
  fetchPage: (options: PaginationOptions) => Promise<PaginatedResponse<T>>,
  initialOptions: PaginationOptions = {},
): AsyncGenerator<T, void, undefined> {
  let after = initialOptions.after;

  while (true) {
    const page = await fetchPage({
      ...initialOptions,
      ...(after ? { after } : {}),
    });

    for (const item of page.data) {
      yield item;
    }

    after = page.paging?.cursors?.after;

    if (!after || !page.paging?.next) {
      break;
    }
  }
}

/**
 * Collects all pages of a cursor-based resource into a single array.
 *
 * @typeParam T - Item type contained in each page.
 * @param fetchPage - Function that retrieves a single page using pagination options.
 * @param initialOptions - Initial pagination options.
 * @returns Flattened array of all items.
 */
export async function collectAllPages<T>(
  fetchPage: (options: PaginationOptions) => Promise<PaginatedResponse<T>>,
  initialOptions: PaginationOptions = {},
): Promise<T[]> {
  const items: T[] = [];

  for await (const item of iteratePages(fetchPage, initialOptions)) {
    items.push(item);
  }

  return items;
}
