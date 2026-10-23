export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are a scam detector for Indian students checking
internship offers, scholarships, and forwarded WhatsApp messages. Analyze
the message for scam patterns.

Return ONLY valid JSON, no markdown, no explanation:
{
  "trustScore": <number 0-100>,
  "verdict": "safe" | "suspicious" | "scam",
  "redFlags": [
    {
      "text": "<short label, max 6 words>",
      "severity": "severe" | "high" | "medium" | "low",
      "explanation": "<one sentence, plain English>"
    }
  ],
  "whyItMatters": "<one sentence with India-specific context>",
  "whatToDo": ["<action step>", "<action step>", "<action step>", "<action step>", "<action step>", "<action step>"]
}

Rules:
- trustScore >= 70 means verdict is "safe" and redFlags may be empty.
- Never return more than 6 redFlags or more than 6 whatToDo steps.
- Never return fewer than 3 whatToDo steps.
- Be specific to the Indian context (registration fees, cybercrime.gov.in, etc.).`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const text = body.text?.trim();
  if (!text || text.length < 20) {
    return json({ error: 'Text is required and must be at least 20 characters' }, 400);
  }
  if (text.length > 8000) {
    return json({ error: 'Text too long (max 8000 characters)' }, 400);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server misconfigured: GROQ_API_KEY missing' }, 500);
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const details = await groqRes.text();
      console.error('Groq error:', groqRes.status, details);
      return json({ error: 'AI service error', status: groqRes.status, details }, 502);
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) {
      return json({ error: 'Empty response from AI' }, 502);
    }

    const parsed = JSON.parse(content);
    return json(parsed, 200);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ error: 'Internal error', message: (err as Error).message }, 500);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}