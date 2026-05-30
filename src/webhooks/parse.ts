import type { InstagramWebhookPayload } from '../types/webhooks.js';
import { ValidationError } from '../errors/index.js';
import { verifyWebhookSignature } from './verify.js';

/**
 * Parses a raw Instagram webhook payload.
 *
 * @param rawBody - Raw JSON request body.
 * @returns Parsed webhook payload.
 */
export function parseWebhookPayload(rawBody: string): InstagramWebhookPayload {
  try {
    const payload = JSON.parse(rawBody) as InstagramWebhookPayload;

    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Webhook payload must be a JSON object.');
    }

    return payload;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError('Webhook payload is not valid JSON.');
  }
}

/**
 * Parses and verifies an Instagram webhook payload signature.
 *
 * @param rawBody - Raw JSON request body.
 * @param options - Signature verification options.
 * @returns Parsed webhook payload when verification succeeds.
 */
export function parseVerifiedWebhookPayload(
  rawBody: string,
  options: {
    signatureHeader?: string;
    appSecret: string;
  },
): InstagramWebhookPayload {
  if (!verifyWebhookSignature(rawBody, options.signatureHeader, options.appSecret)) {
    throw new ValidationError('Invalid webhook signature.');
  }

  return parseWebhookPayload(rawBody);
}
