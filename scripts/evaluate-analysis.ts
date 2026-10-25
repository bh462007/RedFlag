import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analysisFixtures } from '../tests/analysis-fixtures.ts';
import {
  ANALYSIS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  analysisResultSchema,
  calculateTrustScore,
  getRetryAfterSeconds,
  verdictFromTrustScore,
} from '../api/analyze.ts';

const MODEL = 'openai/gpt-oss-20b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_REPEAT_COUNT = 1;
const MAX_REPEAT_COUNT = 5;
const MAX_RETRY_ATTEMPTS = 3;
const MAX_RETRY_WAIT_SECONDS = 30;
const REPORT_DIR = join(process.cwd(), 'reports', 'analysis-evaluation');

type RunResult =
  | {
      fixtureId: string;
      run: number;
      timestamp: string;
      status: 'success';
      findings: Array<{
        text: string;
        severity: string;
        explanation: string;
      }>;
      trustScore: number;
      verdict: string;
      grounding: {
        matched: string[];
        unmatched: string[];
      };
      expectedWarningSigns: {
        matched: string[];
        unmatched: string[];
        acceptableSeverityRange: string[];
      };
      mustNotClaim: string[];
    }
  | {
      fixtureId: string;
      run: number;
      timestamp: string;
      status: 'failed';
      error: string;
      mustNotClaim: string[];
    };

type FixtureEvaluation = {
  fixtureId: string;
  successfulRuns: number;
  failedRuns: number;
  severityConsistency: {
    comparableFindingTexts: string[];
    inconsistentFindingTexts: string[];
    note: string;
  };
  outOfRangeSeverities: string[];
};

function parseRepeatCount(value: string | undefined): number {
  if (value === undefined) return DEFAULT_REPEAT_COUNT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_REPEAT_COUNT) {
    throw new Error(`repeat count must be an integer from 1 to ${MAX_REPEAT_COUNT}`);
  }
  return parsed;
}

function phraseMatches(text: string, phrase: string): boolean {
  return text.toLocaleLowerCase().includes(phrase.toLocaleLowerCase());
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/[\r\n\t]+/g, ' ').slice(0, 200);
  }
  return 'Unknown evaluation failure';
}

async function requestAnalysis(apiKey: string, text: string): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
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
    });

    if (response.status === 429) {
      const details = await response.text();
      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw new Error(
          `Groq rate limit persisted after ${MAX_RETRY_ATTEMPTS} attempts`,
        );
      }
      const retryAfterSeconds = Math.min(
        getRetryAfterSeconds(response, details),
        MAX_RETRY_WAIT_SECONDS,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, retryAfterSeconds * 1000),
      );
      continue;
    }

    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }

    const providerBody = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = providerBody.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('Provider returned no analysis content');
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error('Provider returned invalid JSON');
    }
  }

  throw new Error('Provider request did not complete');
}

export async function latestReportPath(
  reportDirectory = REPORT_DIR,
): Promise<string> {
  const entries = await readdir(reportDirectory, { withFileTypes: true });
  const reports = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith('evaluation-') &&
        entry.name.endsWith('.json'),
    )
    .map((entry) => entry.name)
    .sort();
  const latest = reports.at(-1);
  if (!latest) {
    throw new Error(
      'No previous evaluation report was found for retry-failed mode',
    );
  }
  return join(reportDirectory, latest);
}

async function failedFixtureIdsFromLatestReport(): Promise<Set<string>> {
  const reportPath = await latestReportPath();
  const parsed: unknown = JSON.parse(await readFile(reportPath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !('results' in parsed)) {
    throw new Error('The previous evaluation report has an invalid shape');
  }
  const results = parsed.results;
  if (!Array.isArray(results)) {
    throw new Error('The previous evaluation report has invalid results');
  }
  const failedIds = new Set<string>();
  for (const result of results) {
    if (
      result &&
      typeof result === 'object' &&
      'status' in result &&
      result.status === 'failed' &&
      'fixtureId' in result &&
      typeof result.fixtureId === 'string'
    ) {
      failedIds.add(result.fixtureId);
    }
  }
  return failedIds;
}

function buildSuccess(
  fixture: (typeof analysisFixtures)[number],
  run: number,
  parsed: unknown,
): RunResult {
  const validated = analysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error('Provider returned an invalid analysis shape');
  }

  const findings = validated.data.redFlags;
  const matched = findings
    .filter((finding) => phraseMatches(fixture.text, finding.text))
    .map((finding) => finding.text);
  const unmatched = findings
    .filter((finding) => !phraseMatches(fixture.text, finding.text))
    .map((finding) => finding.text);
  const expectedMatched = fixture.expectedWarningSigns.filter((phrase) =>
    findings.some((finding) => phraseMatches(finding.text, phrase)),
  );

  const trustScore = calculateTrustScore(findings);
  return {
    fixtureId: fixture.id,
    run,
    timestamp: new Date().toISOString(),
    status: 'success',
    findings,
    trustScore,
    verdict: verdictFromTrustScore(trustScore),
    grounding: { matched, unmatched },
    expectedWarningSigns: {
      matched: expectedMatched,
      unmatched: fixture.expectedWarningSigns.filter(
        (phrase) => !expectedMatched.includes(phrase),
      ),
      acceptableSeverityRange: fixture.acceptableSeverityRange,
    },
    mustNotClaim: fixture.mustNotClaim,
  };
}

function printSummary(
  results: RunResult[],
  repeatCount: number,
  evaluationTimestamp: string,
): FixtureEvaluation[] {
  const successes = results.filter((result) => result.status === 'success');
  const failures = results.length - successes.length;
  const evaluations: FixtureEvaluation[] = [];
  console.log(`Analysis evaluation: ${evaluationTimestamp}`);
  console.log(`Model: ${MODEL} | Runs per fixture: ${repeatCount}`);
  console.log(`Successful runs: ${successes.length} | Failed runs: ${failures}`);

  for (const fixture of analysisFixtures) {
    const fixtureResults = results.filter((result) => result.fixtureId === fixture.id);
    const successful = fixtureResults.filter(
      (result): result is Extract<RunResult, { status: 'success' }> =>
        result.status === 'success',
    );
    const scores = successful.map((result) => result.trustScore);
    const severities = successful.flatMap((result) =>
      result.findings.map((finding) => finding.severity),
    );
    const unmatched = successful.flatMap((result) => result.grounding.unmatched);
    const severityByFinding = new Map<string, Set<string>>();
    for (const result of successful) {
      for (const finding of result.findings) {
        const key = finding.text.toLocaleLowerCase();
        const severitiesForFinding = severityByFinding.get(key) ?? new Set<string>();
        severitiesForFinding.add(finding.severity);
        severityByFinding.set(key, severitiesForFinding);
      }
    }
    const comparableFindingTexts = [...severityByFinding.entries()]
      .filter(([, severitiesForFinding]) => severitiesForFinding.size === 1)
      .map(([text]) => text);
    const inconsistentFindingTexts = [...severityByFinding.entries()]
      .filter(([, severitiesForFinding]) => severitiesForFinding.size > 1)
      .map(([text]) => text);
    const outOfRangeSeverities = successful.flatMap((result) =>
      result.findings
        .filter(
          (finding) =>
            fixture.acceptableSeverityRange.length > 0 &&
            !fixture.acceptableSeverityRange.includes(
              finding.severity as (typeof fixture.acceptableSeverityRange)[number],
            ),
        )
        .map((finding) => finding.severity),
    );
    evaluations.push({
      fixtureId: fixture.id,
      successfulRuns: successful.length,
      failedRuns: fixtureResults.length - successful.length,
      severityConsistency: {
        comparableFindingTexts,
        inconsistentFindingTexts,
        note: 'Exact finding-text comparison is descriptive only; paraphrases may represent the same risk.',
      },
      outOfRangeSeverities,
    });
    console.log(
      `- ${fixture.id}: ${successful.length}/${fixtureResults.length} successful; ` +
        `scores=${scores.length ? scores.join(', ') : 'n/a'}; ` +
        `severities=${severities.length ? severities.join(', ') : 'none'}; ` +
        `unmatched findings=${unmatched.length}`,
    );
    if (repeatCount > 1 && severityByFinding.size > 0) {
      console.log(
        `  Comparable exact finding texts: ${comparableFindingTexts.length}; ` +
          `inconsistent exact finding texts: ${inconsistentFindingTexts.length}.`,
      );
    }
    if (outOfRangeSeverities.length > 0) {
      console.log(`  Out-of-range severities: ${outOfRangeSeverities.join(', ')}.`);
    }
    console.log(`  Must-not-claim review: ${fixture.mustNotClaim.join(' ')}`);
  }
  return evaluations;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const retryFailed = args.includes('--retry-failed');
  const repeatArgument = args.find((arg) => arg !== '--retry-failed');
  const repeatCount = parseRepeatCount(repeatArgument);
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured; no network request was made.');
  }

  const failedFixtureIds = retryFailed
    ? await failedFixtureIdsFromLatestReport()
    : undefined;
  const fixturesToEvaluate = failedFixtureIds
    ? analysisFixtures.filter((fixture) => failedFixtureIds.has(fixture.id))
    : analysisFixtures;
  if (fixturesToEvaluate.length === 0) {
    throw new Error('The previous evaluation report contains no failed fixtures');
  }

  const evaluationTimestamp = new Date().toISOString();
  const results: RunResult[] = [];
  for (const fixture of fixturesToEvaluate) {
    for (let run = 1; run <= repeatCount; run += 1) {
      try {
        const parsed = await requestAnalysis(apiKey, fixture.text);
        results.push(buildSuccess(fixture, run, parsed));
      } catch (error) {
        results.push({
          fixtureId: fixture.id,
          run,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: sanitizeError(error),
          mustNotClaim: fixture.mustNotClaim,
        });
      }
    }
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = join(
    REPORT_DIR,
    `evaluation-${evaluationTimestamp.replace(/[:.]/g, '-')}.json`,
  );
  const fixtureEvaluations = printSummary(
    results,
    repeatCount,
    evaluationTimestamp,
  );
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        model: MODEL,
        repeatCount,
        evaluationTimestamp,
        successfulRuns: results.filter((result) => result.status === 'success').length,
        failedRuns: results.filter((result) => result.status === 'failed').length,
        fixtureEvaluations,
        results,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`Detailed report: ${reportPath}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`Evaluation not run: ${sanitizeError(error)}`);
    process.exitCode = 1;
  });
}
