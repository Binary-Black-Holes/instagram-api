import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookChallengeQuery } from '../types/webhooks.js';
import { ValidationError } from '../errors/index.js';

/**
 * Verifies the `X-Hub-Signature-256` header for a Meta webhook payload.
 *
 * @param rawBody - Raw request body bytes before JSON parsing.
 * @param signatureHeader - Value of the `X-Hub-Signature-256` header.
 * @param appSecret - Meta application secret.
 * @returns Whether the signature is valid.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=') || !appSecret) {
    return false;
  }

  const provided = signatureHeader.slice('sha256='.length);
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
}

/**
 * Validates Meta webhook verification challenge requests.
 *
 * @param query - Verification query parameters from Meta.
 * @param verifyToken - Verify token configured in the Meta app dashboard.
 * @returns Challenge string to echo back when verification succeeds.
 */
export function verifyWebhookChallenge(
  query: WebhookChallengeQuery,
  verifyToken: string,
): string {
  if (query['hub.mode'] !== 'subscribe') {
    throw new ValidationError('Invalid webhook verification mode.');
  }

  if (query['hub.verify_token'] !== verifyToken) {
    throw new ValidationError('Invalid webhook verify token.');
  }

  if (!query['hub.challenge']) {
    throw new ValidationError('Webhook challenge is missing.');
  }

  return query['hub.challenge'];
}
