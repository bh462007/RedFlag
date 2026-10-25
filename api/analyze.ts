import { z } from 'zod';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are RedFlag, a scam-risk analysis assistant for Indian students evaluating internship offers, scholarships, job messages, and forwarded messages.
Analyze only the supplied text. Do not invent facts or claim to verify websites, domains, companies, or identities.
Identify evidence-based fraud indicators such as upfront payments, requests for secrets, deceptive links, threats, and implausible compensation. Treat missing information, unfamiliar companies, generic greetings, personal email addresses, and lack of an interview as verification concerns rather than proof.
Return only valid JSON with redFlags, whyItMatters, and whatToDo. Use no more than six evidence-based red flags, each with text quoting or closely identifying the supplied text, severity, and explanation. Do not invent evidence. Return three to six practical safety steps. The backend calculates the trust score and verdict from the validated red flags.`;

const requestSchema = z.object({
  text: z.string().trim().min(20).max(8000),
});

const analysisResultSchema = z
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

const ANALYSIS_JSON_SCHEMA = {
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
const MIN_RETRY_AFTER_SECONDS = 1;
const MAX_RETRY_AFTER_SECONDS = 300;

export default async function handler(req: Request): Promise<Response> {
  const startedAt = Date.now();

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
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
    const trustScore = calculateTrustScore(result.data.redFlags);
    return json(
      {
        ...result.data,
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
