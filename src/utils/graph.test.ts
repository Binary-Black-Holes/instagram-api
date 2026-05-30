import { describe, expect, it } from 'vitest';
import {
  buildBusinessDiscoveryFields,
  serializeCarouselChildren,
  serializeProductTags,
} from './graph.js';

describe('graph utils', () => {
  it('builds business discovery field expressions', () => {
    expect(buildBusinessDiscoveryFields('bluebottle')).toBe(
      'business_discovery.username(bluebottle){id,username,followers_count,media_count}',
    );
    expect(buildBusinessDiscoveryFields('bluebottle', ['followers_count', 'media'])).toBe(
      'business_discovery.username(bluebottle){followers_count,media}',
    );
  });

  it('serializes carousel child container IDs', () => {
    expect(serializeCarouselChildren(['1', '2', '3'])).toBe('1,2,3');
  });

  it('serializes product tags for Graph API requests', () => {
    expect(
      serializeProductTags([
        { productId: '123', x: 0.5, y: 0.8 },
        { productId: 456 },
      ]),
    ).toBe('[{"product_id":"123","x":0.5,"y":0.8},{"product_id":456}]');
  });
});
