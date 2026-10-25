import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  default as handler,
  calculateTrustScore,
  getRetryAfterSeconds,
  SEVERITY_WEIGHTS,
  verdictFromTrustScore,
} from '../api/analyze.ts';
import { onRequest as onAnalyzeRequest } from '../functions/api/analyze.ts';
import { onRequest as onUnknownApiRequest } from '../functions/api/[[path]].ts';
import { latestReportPath } from '../scripts/evaluate-analysis.ts';
import { analysisFixtures } from './analysis-fixtures.ts';

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

function finding(
  text: string,
  severity: 'severe' | 'high' | 'medium' | 'low',
) {
  return { text, severity, explanation: 'Evidence-based explanation.' };
}

test('applies documented severity weights with bounded scores', () => {
  assert.equal(calculateTrustScore([]), 100);
  assert.equal(
    calculateTrustScore([
      finding('severe signal', 'severe'),
      finding('high signal', 'high'),
      finding('medium signal', 'medium'),
      finding('low signal', 'low'),
    ]),
    100 -
      SEVERITY_WEIGHTS.severe -
      SEVERITY_WEIGHTS.high -
      SEVERITY_WEIGHTS.medium -
      SEVERITY_WEIGHTS.low,
  );
  assert.equal(
    calculateTrustScore([
      finding('one', 'severe'),
      finding('two', 'severe'),
      finding('three', 'severe'),
    ]),
    0,
  );
});

test('keeps the strongest severity for exact duplicates regardless of order', () => {
  const firstOrder = [
    finding('Urgent payment required!', 'low'),
    finding('urgent payment required', 'severe'),
  ];
  const secondOrder = [...firstOrder].reverse();

  assert.equal(
    calculateTrustScore(firstOrder),
    100 - SEVERITY_WEIGHTS.severe,
  );
  assert.equal(
    calculateTrustScore(secondOrder),
    100 - SEVERITY_WEIGHTS.severe,
  );
});

test('retains distinct findings with overlapping wording', () => {
  assert.equal(
    calculateTrustScore([
      finding('Urgent payment required', 'high'),
      finding('Urgent payment required before offer letter', 'medium'),
    ]),
    100 - SEVERITY_WEIGHTS.high - SEVERITY_WEIGHTS.medium,
  );
});

test('derives verdicts from score boundaries', () => {
  assert.equal(verdictFromTrustScore(100), 'safe');
  assert.equal(verdictFromTrustScore(70), 'safe');
  assert.equal(verdictFromTrustScore(69), 'suspicious');
  assert.equal(verdictFromTrustScore(40), 'suspicious');
  assert.equal(verdictFromTrustScore(39), 'scam');
  assert.equal(verdictFromTrustScore(0), 'scam');
});

test('keeps payment-before-offer in the severe policy range', () => {
  const fixture = analysisFixtures.find(
    ({ id }) => id === 'training-fee-before-offer',
  );
  assert.ok(fixture);
  assert.deepEqual(fixture.acceptableSeverityRange, ['severe']);
  const score = calculateTrustScore([
    finding('pay a 4,999 mandatory training fee', 'severe'),
  ]);
  assert.equal(score, 65);
  assert.equal(verdictFromTrustScore(score), 'suspicious');
});

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

test('selects the latest evaluation report and ignores unrelated JSON files', async () => {
  const reportDirectory = await mkdtemp(
    join(tmpdir(), 'clause-by-clause-reports-'),
  );
  try {
    const expectedReport = join(
      reportDirectory,
      'evaluation-2026-01-02T00-00-00-000Z.json',
    );
    await writeFile(expectedReport, '{}', 'utf8');
    await writeFile(join(reportDirectory, 'notes-9999.json'), '{}', 'utf8');

    assert.equal(await latestReportPath(reportDirectory), expectedReport);
  } finally {
    await rm(reportDirectory, { recursive: true, force: true });
  }
});

test('calculates score and verdict instead of trusting model-provided fields', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;

  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                redFlags: [
                  {
                    text: '  Upfront payment  ',
                    severity: 'severe',
                    explanation: '  Requests payment before the internship begins.  ',
                  },
                ],
                whyItMatters: '  Payment requests deserve verification.  ',
                whatToDo: [
                  '  Verify the employer independently.  ',
                  'Do not pay before verification.',
                  'Contact the official organization.',
                ],
                trustScore: 100,
                verdict: 'safe',
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await handler(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a sufficiently long submitted message for testing.',
        }),
      }),
    );
    const body = (await response.json()) as {
      trustScore?: number;
      verdict?: string;
    };

    assert.equal(response.status, 200);
    assert.equal(body.trustScore, 65);
    assert.equal(body.verdict, 'suspicious');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('accepts a valid request body', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                redFlags: [],
                whyItMatters: 'No concrete warning sign was identified.',
                whatToDo: [
                  'Verify the sender independently.',
                  'Review the complete opportunity details.',
                  'Avoid sharing sensitive information.',
                ],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await handler(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a sufficiently long submitted message for testing.',
        }),
      }),
    );

    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('Pages Function injects the provider secret without using process.env', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  let authorization = '';
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get('Authorization') ?? '';
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                redFlags: [],
                whyItMatters: 'No concrete warning sign was identified.',
                whatToDo: [
                  'Verify the sender independently.',
                  'Review the complete opportunity details.',
                  'Avoid sharing sensitive information.',
                ],
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };

  try {
    const response = await onAnalyzeRequest({
      request: new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text: 'This is a sufficiently long submitted message for testing.',
        }),
      }),
      env: { GROQ_API_KEY: 'test-only-pages-secret' },
    });

    assert.equal(response.status, 200);
    assert.equal(authorization, 'Bearer test-only-pages-secret');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('Pages Function returns the existing safe error when its secret is missing', async () => {
  const originalFetch = globalThis.fetch;
  let providerCalled = false;
  globalThis.fetch = async () => {
    providerCalled = true;
    return new Response();
  };

  try {
    const response = await onAnalyzeRequest({
      request: new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text: 'This is a sufficiently long submitted message for testing.',
        }),
      }),
      env: {},
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: 'Server misconfigured: GROQ_API_KEY missing',
    });
    assert.equal(providerCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Pages API unknown routes return JSON 404 responses', async () => {
  const response = onUnknownApiRequest({
    request: new Request('http://localhost/api/unknown'),
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await response.json(), { error: 'API route not found' });
});

test('Pages analyzer route preserves method handling for unsupported methods', async () => {
  const response = await onAnalyzeRequest({
    request: new Request('http://localhost/api/analyze', {
      method: 'GET',
    }),
    env: { GROQ_API_KEY: 'test-only-pages-secret' },
  });

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'Method not allowed' });
});

test('rejects an oversized request body before calling the provider', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  let providerCalled = false;
  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () => {
    providerCalled = true;
    return new Response();
  };

  try {
    const response = await handler(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '65537',
        },
        body: 'x'.repeat(65_537),
      }),
    );

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: 'Request body too large',
    });
    assert.equal(providerCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('rejects an oversized request body without Content-Length', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  let providerCalled = false;
  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () => {
    providerCalled = true;
    return new Response();
  };
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'.repeat(65_537)));
      controller.close();
    },
  });

  try {
    const response = await handler(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: stream,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' }),
    );

    assert.equal(response.status, 413);
    assert.equal(providerCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('keeps malformed JSON as a 400 client error', async () => {
  const response = await handler(
    new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"text":',
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body' });
});

test('enforces severe severity only for explicit payment-before-offer requirements', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  const cases = [
    {
      message: 'Payment is required before receiving your offer letter.',
      triggers: true,
    },
    {
      message:
        'Selected candidates must pay a mandatory fee before receiving their offer letter.',
      triggers: true,
    },
    {
      message: 'No payment is required before receiving your offer letter.',
      triggers: false,
    },
    {
      message: 'You do not need to pay before receiving your offer letter.',
      triggers: false,
    },
    {
      message:
        'You are not required to pay before receiving your offer letter.',
      triggers: false,
    },
    {
      message: 'Payment is not required before receiving your offer letter.',
      triggers: false,
    },
    {
      message:
        'Pay the registration fee after receiving your offer letter.',
      triggers: false,
    },
    {
      message:
        'The training fee and offer letter will be discussed during the call.',
      triggers: false,
    },
    {
      message:
        'The training program costs ₹4,999, payable after the offer letter is issued.',
      triggers: false,
    },
  ];

  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                redFlags: [
                  {
                    text: 'payment',
                    severity: 'high',
                    explanation: 'The message asks for a training fee.',
                  },
                ],
                whyItMatters: 'Payment before an offer requires careful verification.',
                whatToDo: [
                  'Verify the opportunity independently.',
                  'Do not pay before verification.',
                  'Use official contact details to confirm the offer.',
                ],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    for (const { message, triggers } of cases) {
      const response = await handler(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        }),
      );
      const body = (await response.json()) as {
        redFlags?: Array<{ text: string; severity: string }>;
        trustScore?: number;
        verdict?: string;
      };

      assert.equal(response.status, 200, message);
      if (triggers) {
        assert.equal(body.redFlags?.length, 1, message);
        assert.equal(body.redFlags?.[0]?.text, message, message);
        assert.equal(body.redFlags?.[0]?.severity, 'severe', message);
        assert.equal(body.trustScore, 65, message);
        assert.equal(body.verdict, 'suspicious', message);
      } else {
        assert.equal(body.redFlags?.length, 1, message);
        assert.equal(body.redFlags?.[0]?.severity, 'high', message);
        assert.equal(body.trustScore, 80, message);
        assert.equal(body.verdict, 'safe', message);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('validates offline fixtures and scores them through the backend handler', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;

  process.env.GROQ_API_KEY = 'test-only-key';

  try {
    for (const fixture of analysisFixtures) {
      assert.ok(fixture.id.trim(), 'fixture ID must be non-empty');
      assert.ok(fixture.text.trim(), `${fixture.id}: text must be non-empty`);
      for (const warningSign of fixture.expectedWarningSigns) {
        assert.ok(
          warningSign.trim(),
          `${fixture.id}: warning sign must be non-empty`,
        );
        assert.ok(
          fixture.text.toLocaleLowerCase().includes(warningSign.toLocaleLowerCase()),
          `${fixture.id}: warning sign must be present in fixture text`,
        );
      }

      const severity = fixture.acceptableSeverityRange[0];
      if (fixture.expectedWarningSigns.length > 0) {
        assert.ok(severity, `${fixture.id}: severity range must be non-empty`);
        assert.ok(
          fixture.acceptableSeverityRange.includes(severity),
          `${fixture.id}: chosen severity must be allowed`,
        );
      } else {
        assert.deepEqual(
          fixture.acceptableSeverityRange,
          [],
          `${fixture.id}: no-warning fixture must have no severity range`,
        );
      }
      const redFlags =
        severity && fixture.expectedWarningSigns.length > 0
          ? [finding(fixture.expectedWarningSigns[0], severity)]
          : [];
      const expectedResponseRedFlags =
        fixture.id === 'training-fee-before-offer'
          ? [
              {
                text: fixture.text,
                severity: 'severe' as const,
                explanation:
                  'This message explicitly requires payment before the offer is received.',
              },
            ]
          : redFlags;

      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    redFlags,
                    whyItMatters: fixture.expectedWarningSigns.length
                      ? 'These points should be checked against the supplied message.'
                      : 'No concrete warning sign is present in the supplied message.',
                    whatToDo: [
                      'Verify the details using an independent official channel.',
                      'Do not share sensitive information or pay before verification.',
                      'Ask for clarification when the message is incomplete.',
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );

      const response = await handler(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fixture.text }),
        }),
      );
      const body = (await response.json()) as {
        redFlags?: unknown[];
        trustScore?: number;
        verdict?: string;
      };

      assert.equal(response.status, 200, fixture.id);
      assert.deepEqual(body.redFlags, expectedResponseRedFlags, fixture.id);
      if (fixture.expectedWarningSigns.length === 0) {
        assert.equal(body.trustScore, 100, fixture.id);
        assert.equal(body.verdict, 'safe', fixture.id);
      }
      assert.equal(
        body.trustScore,
        calculateTrustScore(expectedResponseRedFlags),
        fixture.id,
      );
      assert.equal(
        body.verdict,
        verdictFromTrustScore(body.trustScore ?? -1),
        fixture.id,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
});

test('rejects whitespace-only AI findings with a safe error', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  const validFinding = finding('Upfront payment', 'high');
  const malformedResults = [
    {
      redFlags: [{ ...validFinding, text: '   ' }],
      whyItMatters: 'The message requests payment.',
      whatToDo: ['Verify the sender', 'Do not pay', 'Check independently'],
    },
    {
      redFlags: [{ ...validFinding, explanation: '   ' }],
      whyItMatters: 'The message requests payment.',
      whatToDo: ['Verify the sender', 'Do not pay', 'Check independently'],
    },
    {
      redFlags: [validFinding],
      whyItMatters: '   ',
      whatToDo: ['Verify the sender', 'Do not pay', 'Check independently'],
    },
    {
      redFlags: [validFinding],
      whyItMatters: 'The message requests payment.',
      whatToDo: ['   ', 'Do not pay', 'Check independently'],
    },
  ];

  process.env.GROQ_API_KEY = 'test-only-key';

  try {
    for (const malformedResult of malformedResults) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: JSON.stringify(malformedResult) },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );

      const response = await handler(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'This is a sufficiently long submitted message for testing.',
          }),
        }),
      );

      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), {
        error: 'AI returned an invalid analysis',
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalApiKey;
    }
  }
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
