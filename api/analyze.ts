import { z } from 'zod';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are RedFlag, a scam-risk analysis assistant for Indian students evaluating internship offers, scholarships, job messages, and forwarded messages.
Analyze only the supplied text. Do not invent facts or claim to verify websites, domains, companies, or identities.
Identify evidence-based fraud indicators such as upfront payments, requests for secrets, deceptive links, threats, and implausible compensation. Treat missing information, unfamiliar companies, generic greetings, personal email addresses, and lack of an interview as verification concerns rather than proof.
Return a trustScore from 0 to 100 where higher means fewer indicators, and keep verdict thresholds consistent: 70-100 safe, 40-69 suspicious, 0-39 scam. A message with no strong indicators must score at least 60.
Return only valid JSON with trustScore, verdict, redFlags, whyItMatters, and whatToDo. Use no more than six evidence-based red flags, each with text, severity, and explanation. Return three to six practical safety steps.`;

const requestSchema = z.object({
  text: z.string().trim().min(20).max(8000),
});

const analysisResultSchema = z
  .object({
    trustScore: z.number().int().min(0).max(100),
    verdict: z.enum(['safe', 'suspicious', 'scam']),
    redFlags: z
      .array(
        z.object({
          text: z.string().min(1).max(120),
          severity: z.enum(['severe', 'high', 'medium', 'low']),
          explanation: z.string().min(1),
        }),
      )
      .max(6),
    whyItMatters: z.string().min(1),
    whatToDo: z.array(z.string().min(1)).min(3).max(6),
  })
  .superRefine((result, ctx) => {
    const expectedVerdict =
      result.trustScore >= 70
        ? 'safe'
        : result.trustScore >= 40
          ? 'suspicious'
          : 'scam';

    if (result.verdict !== expectedVerdict) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['verdict'],
        message: 'Verdict does not match trustScore',
      });
    }

    if (result.trustScore > 80 && result.redFlags.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redFlags'],
        message: 'Scores above 80 must not contain red flags',
      });
    }
  });

const UPSTREAM_TIMEOUT_MS = 20_000;

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
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      },
    );

    if (!groqRes.ok) {
      const details = await groqRes.text();
      console.error('Groq request failed', {
        status: groqRes.status,
        durationMs: Date.now() - startedAt,
      });

      if (groqRes.status === 429) {
        const match = details.match(/try again in ([\d.]+)s/i);
        const retryAfterSeconds = match ? Math.ceil(Number(match[1])) : 10;
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
        durationMs: Date.now() - startedAt,
      });
      return json({ error: 'AI returned an invalid analysis' }, 502);
    }

    console.info('Analysis request completed', {
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    return json(result.data, 200);
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
