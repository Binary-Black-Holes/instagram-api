import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { webhookCommentEvent } from '../test/fixtures/graphApi.js';
import { parseVerifiedWebhookPayload, parseWebhookPayload } from './parse.js';
import { verifyWebhookChallenge, verifyWebhookSignature } from './verify.js';

const APP_SECRET = 'test-app-secret';

describe('verifyWebhookSignature', () => {
  it('validates genuine webhook signatures', () => {
    const rawBody = JSON.stringify(webhookCommentEvent);
    const digest = createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');

    expect(verifyWebhookSignature(rawBody, `sha256=${digest}`, APP_SECRET)).toBe(true);
    expect(verifyWebhookSignature(rawBody, 'sha256=invalid', APP_SECRET)).toBe(false);
  });
});

describe('verifyWebhookChallenge', () => {
  it('returns the challenge when verification succeeds', () => {
    expect(
      verifyWebhookChallenge(
        {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'my-verify-token',
          'hub.challenge': 'challenge-string',
        },
        'my-verify-token',
      ),
    ).toBe('challenge-string');
  });
});

describe('parseWebhookPayload', () => {
  it('parses webhook comment events', () => {
    const payload = parseWebhookPayload(JSON.stringify(webhookCommentEvent));

    expect(payload.object).toBe('instagram');
    expect(payload.entry?.[0]?.changes?.[0]?.field).toBe('comments');
  });

  it('parses verified payloads when signature matches', () => {
    const rawBody = JSON.stringify(webhookCommentEvent);
    const digest = createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');

    const payload = parseVerifiedWebhookPayload(rawBody, {
      signatureHeader: `sha256=${digest}`,
      appSecret: APP_SECRET,
    });

    expect(payload.entry?.[0]?.id).toBe('17841405309211844');
  });
});
