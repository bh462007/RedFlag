import { z } from 'zod';

export const config = { runtime: 'edge' };

export const SYSTEM_PROMPT = `You are RedFlag, a scam-risk analysis assistant for Indian students evaluating internship offers, scholarships, job messages, and forwarded messages.
Analyze only the exact submitted message. Ground every red flag in that message, preferably using a short exact quote or distinctive phrase from it in redFlags[].text. Explain why that specific phrase indicates a risk. Do not invent actions, requests, links, fees, identities, promises, or other facts absent from the input, and never claim external verification was performed.
Assign severity using these definitions as guidance based on the actual wording, not as automatic keyword rules:
- severe: direct requests for OTPs, passwords, banking or card credentials, or explicit payment as a condition of receiving an offer.
- high: explicit upfront fees, coercive threats, deceptive-link instructions evident from the text, or strongly implausible guaranteed claims.
- medium: materially misleading promises or multiple concrete verification concerns without a direct severe indicator.
- low: limited verification concerns that warrant checking but are not proof of fraud.
Do not treat unfamiliar companies, generic greetings, personal email addresses, missing company/contact details, missing interview details, incomplete role or stipend information, routine form deadlines, or ordinary requests for availability alone as red flags. These may warrant neutral verification advice in whatToDo, but do not create redFlags for them unless the message contains a separate, concrete risk indicator. Do not infer malicious intent from a routine form or link mention, or invent a purpose for collecting data. Reserve severe for direct requests for OTPs, passwords, banking/card credentials, or explicit payment required to receive an offer. A request for general identity details or a coercive deadline alone is not severe; classify it according to the actual wording and the existing rubric. Treat strongly implausible guaranteed salary or placement claims as potential red flags, but do not flag short duration or missing details separately when they merely provide context for the same claim. Keep findings concise, grounded in the submitted message, and limited to distinct, concrete risks. Do not use explanations to assert that a sender intends to deceive, steal credentials, or commit fraud unless the supplied text directly supports that claim. Make whyItMatters and whatToDo relevant to the actual findings, and use practical safety advice rather than inventing risks when no red flags are present.
Return only valid JSON with redFlags, whyItMatters, and whatToDo. Use no more than six evidence-based red flags. Return three to six practical safety steps. The backend calculates the trust score and verdict from the validated red flags.`;

const requestSchema = z.object({
  text: z.string().trim().min(20).max(8000),
});

export const analysisResultSchema = z
  .object({
    redFlags: z
      .array(
        z.object({
          text: z
            .string()
            .min(1)
            .max(120)
            .refine((value) => /\S/.test(value), 'Must contain non-whitespace content'),
          severity: z.enum(['severe', 'high', 'medium', 'low']),
          explanation: z
            .string()
            .min(1)
            .refine((value) => /\S/.test(value), 'Must contain non-whitespace content'),
        }),
      )
      .max(6),
    whyItMatters: z
      .string()
      .min(1)
      .refine((value) => /\S/.test(value), 'Must contain non-whitespace content'),
    whatToDo: z
      .array(
        z
          .string()
          .min(1)
          .refine((value) => /\S/.test(value), 'Must contain non-whitespace content'),
      )
      .min(3)
      .max(6),
  });

export const SEVERITY_WEIGHTS = {
  severe: 35,
  high: 20,
  medium: 10,
  low: 5,
} as const;

export const SCORE_BOUNDS = {
  min: 0,
  max: 100,
} as const;

type AnalysisDetails = z.infer<typeof analysisResultSchema>;
type Verdict = 'safe' | 'suspicious' | 'scam';

function normalizeFindingText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function deduplicateFindings(
  findings: AnalysisDetails['redFlags'],
): AnalysisDetails['redFlags'] {
  const findingsByText = new Map<
    string,
    AnalysisDetails['redFlags'][number]
  >();

  for (const finding of findings) {
    const normalized = normalizeFindingText(finding.text);
    if (!normalized) continue;

    const existing = findingsByText.get(normalized);
    if (
      !existing ||
      SEVERITY_WEIGHTS[finding.severity] >
        SEVERITY_WEIGHTS[existing.severity]
    ) {
      findingsByText.set(normalized, finding);
    }
  }

  return [...findingsByText.values()];
}

function paymentBeforeOfferQuote(text: string): string | undefined {
  const sentences = text.match(/[^.!?\n]+[.!?]?/g) ?? [text];
  const offerCondition =
    /\b(?:before|prior to|to receive|to get|in order to receive)\b[\s\S]*\boffer(?:\s+letter)?\b/i;
  const negativeRequirement =
    /\b(?:no|not|never)\s+(?:payment|fee|fees)\s+(?:is\s+)?required\b|\b(?:payment|fee|fees)\s+is\s+not\s+required\b|\b(?:do|does|did)\s+not\s+need\s+to\s+pay\b|\b(?:am|are|is|was|were)\s+not\s+required\s+to\s+pay\b|\b(?:don't|doesn't|didn't|isn't|aren't|wasn't|weren't)\s+(?:need|required)\b/i;
  const explicitPaymentRequirement =
    /\b(?:payment|fee|fees)\s+(?:is\s+)?required\b|\b(?:must|need to|have to)\s+pay\b|\bpay\b[\s\S]*\b(?:before|prior to)\b/i;

  for (const sentence of sentences) {
    if (
      !offerCondition.test(sentence) ||
      negativeRequirement.test(sentence) ||
      !explicitPaymentRequirement.test(sentence)
    ) {
      continue;
    }

    const quote = sentence.trim();
    return quote.length <= 120 ? quote : quote.slice(0, 120).trimEnd();
  }

  return undefined;
}

function findingsOverlap(
  first: string,
  second: string,
): boolean {
  const normalizedFirst = normalizeFindingText(first);
  const normalizedSecond = normalizeFindingText(second);
  return (
    normalizedFirst.includes(normalizedSecond) ||
    normalizedSecond.includes(normalizedFirst)
  );
}

function applyDeterministicPolicies(
  text: string,
  findings: AnalysisDetails['redFlags'],
): AnalysisDetails['redFlags'] {
  const quote = paymentBeforeOfferQuote(text);
  if (!quote) return findings;

  const remaining = findings.filter(
    (finding) =>
      !findingsOverlap(finding.text, quote) &&
      !/\b(?:pay|payment|fee|fees)\b/i.test(finding.text),
  );
  const enforcedFinding = {
    text: quote,
    severity: 'severe' as const,
    explanation:
      'This message explicitly requires payment before the offer is received.',
  };

  if (remaining.length < 6) {
    return [...remaining, enforcedFinding];
  }

  const lowestSeverityIndex = remaining.reduce(
    (lowestIndex, finding, index, allFindings) =>
      SEVERITY_WEIGHTS[finding.severity] <
      SEVERITY_WEIGHTS[allFindings[lowestIndex].severity]
        ? index
        : lowestIndex,
    0,
  );
  return [
    ...remaining.slice(0, lowestSeverityIndex),
    ...remaining.slice(lowestSeverityIndex + 1),
    enforcedFinding,
  ];
}

/** Heuristic policy, not a calibrated fraud probability. Duplicate findings count once. */
export function calculateTrustScore(
  findings: AnalysisDetails['redFlags'],
): number {
  const penalty = deduplicateFindings(findings).reduce(
    (total, finding) => total + SEVERITY_WEIGHTS[finding.severity],
    0,
  );
  return Math.max(
    SCORE_BOUNDS.min,
    Math.min(SCORE_BOUNDS.max, SCORE_BOUNDS.max - penalty),
  );
}

export function verdictFromTrustScore(score: number): Verdict {
  return score >= 70 ? 'safe' : score >= 40 ? 'suspicious' : 'scam';
}

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    redFlags: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            pattern: '\\S',
          },
          severity: {
            type: 'string',
            enum: ['severe', 'high', 'medium', 'low'],
          },
          explanation: { type: 'string', minLength: 1, pattern: '\\S' },
        },
        required: ['text', 'severity', 'explanation'],
        additionalProperties: false,
      },
    },
    whyItMatters: { type: 'string', minLength: 1, pattern: '\\S' },
    whatToDo: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'string', minLength: 1, pattern: '\\S' },
    },
  },
  required: ['redFlags', 'whyItMatters', 'whatToDo'],
  additionalProperties: false,
} as const;

const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_REQUEST_BODY_BYTES = 65_536;
const MIN_RETRY_AFTER_SECONDS = 1;
const MAX_RETRY_AFTER_SECONDS = 300;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'RequestBodyTooLargeError';
  }
}

async function readJsonBody(req: Request): Promise<unknown> {
  const contentLength = req.headers.get('Content-Length');
  if (
    contentLength &&
    Number.isInteger(Number(contentLength)) &&
    Number(contentLength) > MAX_REQUEST_BODY_BYTES
  ) {
    throw new RequestBodyTooLargeError();
  }

  if (!req.body) {
    return req.json();
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

export default async function handler(req: Request): Promise<Response> {
  const startedAt = Date.now();

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: 'Request body too large' }, 413);
    }
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const request = requestSchema.safeParse(body);
  if (!request.success) {
    return json(
      { error: 'Text is required and must be between 20 and 8000 characters' },
      400,
    );
  }

  console.info('Analysis request received', {
    textLength: request.data.text.length,
  });

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    console.error('Analysis request failed', {
      category: 'missing-api-key',
      durationMs: Date.now() - startedAt,
    });
    return json({ error: 'Server misconfigured: GROQ_API_KEY missing' }, 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: request.data.text },
          ],
          temperature: 0.2,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'analysis_result',
              strict: true,
              schema: ANALYSIS_JSON_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      },
    );

    if (!groqRes.ok) {
      const details = await groqRes.text();
      console.error('Groq request failed', {
        status: groqRes.status,
        ...providerErrorSummary(details),
        durationMs: Date.now() - startedAt,
      });

      if (groqRes.status === 429) {
        const retryAfterSeconds = getRetryAfterSeconds(groqRes, details);
        return new Response(
          JSON.stringify({
            error: 'AI service is temporarily busy. Please try again shortly.',
            retryAfterSeconds,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSeconds),
            },
          },
        );
      }

      return json({ error: 'AI service error' }, 502);
    }

    const groqData: unknown = await groqRes.json();
    const content = z
      .object({
        choices: z
          .array(
            z.object({
              message: z.object({ content: z.string().optional() }),
            }),
          )
          .optional(),
      })
      .safeParse(groqData).data?.choices?.[0]?.message.content;

    if (!content) {
      console.error('Analysis request failed', {
        category: 'empty-ai-response',
        durationMs: Date.now() - startedAt,
      });
      return json({ error: 'Empty response from AI' }, 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Analysis request failed', {
        category: 'invalid-ai-json',
        durationMs: Date.now() - startedAt,
      });
      return json({ error: 'AI returned invalid JSON' }, 502);
    }

    const result = analysisResultSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Analysis request failed', {
        category: 'invalid-ai-analysis',
        validationIssues: result.error.issues.slice(0, 5).map((issue) => ({
          code: issue.code,
          path: issue.path.join('.'),
          message: issue.message,
        })),
        durationMs: Date.now() - startedAt,
      });
      return json({ error: 'AI returned an invalid analysis' }, 502);
    }

    console.info('Analysis request completed', {
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    const redFlags = applyDeterministicPolicies(
      request.data.text,
      result.data.redFlags,
    );
    const trustScore = calculateTrustScore(redFlags);
    return json(
      {
        ...result.data,
        redFlags,
        trustScore,
        verdict: verdictFromTrustScore(trustScore),
      },
      200,
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Analysis request failed', {
        category: 'upstream-timeout',
        durationMs: Date.now() - startedAt,
      });
      return json({ error: 'AI service timed out. Please try again.' }, 504);
    }
    console.error('Analysis request failed', {
      category: 'handler-error',
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage:
        err instanceof Error ? err.message : 'Non-Error value thrown',
      errorStack:
        err instanceof Error ? err.stack?.split('\n', 1)[0] : undefined,
      durationMs: Date.now() - startedAt,
    });
    return json({ error: 'Unable to complete analysis' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function providerErrorSummary(details: string): {
  providerErrorCode?: string;
  providerErrorMessage?: string;
} {
  try {
    const parsed: unknown = JSON.parse(details);
    if (!parsed || typeof parsed !== 'object' || !('error' in parsed)) {
      return {};
    }

    const error = parsed.error;
    if (!error || typeof error !== 'object') {
      return {};
    }

    const code =
      'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : undefined;

    return {
      providerErrorCode: code?.slice(0, 100),
      providerErrorMessage: message
        ?.replace(/[\r\n\t]+/g, ' ')
        .replace(/org_[A-Za-z0-9]+/g, '[redacted-org]')
        .replace(/https?:\/\/\S+/gi, '[redacted-url]')
        .slice(0, 300),
    };
  } catch {
    return {};
  }
}

export function getRetryAfterSeconds(
  response: Response,
  details: string,
): number {
  const retryAfterHeader = response.headers.get('Retry-After');
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return clampRetryAfterSeconds(seconds);
    }

    const retryAt = Date.parse(retryAfterHeader);
    if (Number.isFinite(retryAt)) {
      return clampRetryAfterSeconds((retryAt - Date.now()) / 1000);
    }
  }

  const match = details.match(/try again in ([\d.]+)\s*s/i);
  if (match) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return clampRetryAfterSeconds(seconds);
    }
  }

  return clampRetryAfterSeconds(10);
}

function clampRetryAfterSeconds(seconds: number): number {
  return Math.min(
    MAX_RETRY_AFTER_SECONDS,
    Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(seconds)),
  );
}
