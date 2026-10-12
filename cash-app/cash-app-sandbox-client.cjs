'use strict';
/** Cash App Pay partner sandbox adapter. No live payout capability. */
const SANDBOX_ORIGIN = 'https://sandbox.api.cash.app';
const PAYOUT_PATH = '/network/v1/payouts';
function buildPayoutRequest({ amountCents, idempotencyKey, recipientGrantId, headers }) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new TypeError('Invalid amount');
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey || '')) throw new TypeError('Invalid idempotency key');
  if (typeof recipientGrantId !== 'string' || !recipientGrantId.trim()) throw new TypeError('Recipient grant required');
  if (!headers || typeof headers !== 'object') throw new TypeError('Partner auth headers required');
  for (const name of ['Authorization', 'X-Signature', 'X-Region']) {
    if (typeof headers[name] !== 'string' || !headers[name].trim()) throw new TypeError('Missing ' + name);
  }
  return Object.freeze({
    url: SANDBOX_ORIGIN + PAYOUT_PATH,
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    // Shape requires verification against the latest official schema before submission.
    draft: { amountCents, idempotencyKey, recipientGrantId },
    sandboxOnly: true,
    submitted: false
  });
}
module.exports = { SANDBOX_ORIGIN, PAYOUT_PATH, buildPayoutRequest };
