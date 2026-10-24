import test from 'node:test';
import assert from 'node:assert/strict';
import {
  default as handler,
  getRetryAfterSeconds,
} from '../api/analyze.ts';

const FIXED_NOW = Date.parse('2026-01-01T00:00:00.000Z');
const FALLBACK_SECONDS = 10;

function withFixedNow<T>(callback: () => T): T {
  const originalNow = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    return callback();
  } finally {
    Date.now = originalNow;
  }
}

function assertBoundedDelay(delay: number): void {
  assert.ok(delay >= 1 && delay <= 300);
}

test('parses numeric and fractional Retry-After values', () => {
  const numeric = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': '12' } }),
    '',
  );
  const fractional = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': '2.9' } }),
    '',
  );

  assert.equal(numeric, 12);
  assert.equal(fractional, 3);
  assertBoundedDelay(numeric);
  assertBoundedDelay(fractional);
});

test('parses future and past HTTP-date Retry-After values', () => {
  const future = withFixedNow(() =>
    getRetryAfterSeconds(
      new Response(null, {
        headers: { 'Retry-After': 'Thu, 01 Jan 2026 00:00:12 GMT' },
      }),
      '',
    ),
  );
  const past = withFixedNow(() =>
    getRetryAfterSeconds(
      new Response(null, {
        headers: { 'Retry-After': 'Wed, 31 Dec 2025 23:59:00 GMT' },
      }),
      '',
    ),
  );

  assert.equal(future, 12);
  assert.equal(past, 1);
  assertBoundedDelay(future);
  assertBoundedDelay(past);
});

test('falls back to provider timing hints and the default delay', () => {
  const providerHint = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': 'not-a-date' } }),
    'Rate limited; try again in 2.9s.',
  );
  const malformed = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': 'not-a-date' } }),
    'Rate limited; retry later.',
  );
  const missing = getRetryAfterSeconds(new Response(), '');

  assert.equal(providerHint, 3);
  assert.equal(malformed, FALLBACK_SECONDS);
  assert.equal(missing, FALLBACK_SECONDS);
  assertBoundedDelay(providerHint);
  assertBoundedDelay(malformed);
  assertBoundedDelay(missing);
});

test('clamps extreme retry delays', () => {
  const hugeHeader = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': '999999999' } }),
    '',
  );
  const hugeHint = getRetryAfterSeconds(
    new Response(null, { headers: { 'Retry-After': 'invalid' } }),
    'try again in 999999999s',
  );

  assert.equal(hugeHeader, 300);
  assert.equal(hugeHint, 300);
  assertBoundedDelay(hugeHeader);
  assertBoundedDelay(hugeHint);
});

test('returns a safe, consistent 429 response', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  const submittedText =
    'Private submitted message that must never appear in the response.';

  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 'rate_limit_exceeded',
          message:
            'try again in 2.9s for org_secret123 https://provider.example',
        },
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      },
    );

  try {
    const response = await handler(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: submittedText }),
      }),
    );
    const body = (await response.json()) as {
      error?: string;
      retryAfterSeconds?: number;
    };

    assert.equal(response.status, 429);
    assert.equal(body.retryAfterSeconds, 3);
    assert.equal(response.headers.get('Retry-After'), '3');
    assert.equal(
      body.error,
      'AI service is temporarily busy. Please try again shortly.',
    );
    assert.doesNotMatch(JSON.stringify(body), /test-only-key|org_secret123|provider\.example|Private submitted message/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});
