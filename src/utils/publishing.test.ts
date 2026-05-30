import { describe, expect, it } from 'vitest';
import { extractPublishingQuota } from './publishing.js';

describe('extractPublishingQuota', () => {
  it('calculates remaining publish slots', () => {
    expect(
      extractPublishingQuota({
        data: [
          {
            quota_usage: 2,
            config: { quota_total: 50, quota_duration: 86400 },
          },
        ],
      }),
    ).toEqual({
      usage: 2,
      total: 50,
      remaining: 48,
      durationSeconds: 86400,
    });
  });
});
