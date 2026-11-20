import type { GeneratedTestCase } from '../types/qa.ts';
import {
  createRateLimiter,
  normalizeGeneratedCases,
  sanitizeRequirementInput,
} from '../utils/coverageLogic.ts';

export interface GenerationResult {
  testCases: GeneratedTestCase[];
  source: 'server' | 'client-fallback';
}

const clientRateLimiter = createRateLimiter(15, 60_000);

function getFallbackClientApiKey(): string {
  const viteKey =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_GEMINI_API_KEY === 'string'
      ? import.meta.env.VITE_GEMINI_API_KEY.trim()
      : '';

  if (viteKey) return viteKey;

  const globalProc = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;
  const processKey = globalProc?.env?.GEMINI_API_KEY?.trim() ?? '';
  return processKey;
}

async function generateWithClientFallback(
  sanitizedRequirement: string,
  nextIdStart: number
): Promise<GeneratedTestCase[]> {
  const rateCheck = clientRateLimiter.check('browser-client');
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Maximum 15 requests per minute allowed. Please retry in ${rateCheck.retryAfterSec}s.`
    );
  }

  const apiKey = getFallbackClientApiKey();
  if (!apiKey) {
    throw new Error(
      'The backend generation endpoint (/api/generate-test-cases) is unreachable in static hosting and no VITE_GEMINI_API_KEY is configured. Run with `npm run dev` / `npm start` or use "Load Demo Data" to evaluate immediately.'
    );
  }

  const { GoogleGenAI, Type } = await import('@google/genai');

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = [
    'Generate 8 thorough, production-grade SQA test cases for the following software requirement.',
    'Ensure balanced coverage across all four categories: Positive (2 cases), Negative (2 cases), Boundary (2 cases), and Security (2 cases).',
    'Each test case must contain actionable preconditions, 3-5 concrete execution steps, and an exact verifiable expected result.',
    '',
    'Requirement Specification:',
    sanitizedRequirement,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a Principal SQA Engineer specializing in test design, boundary value analysis, negative testing, and application security testing. Produce strictly structured, deterministic, high-signal test cases with zero fluff.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          testCases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ['Positive', 'Negative', 'Boundary', 'Security'],
                },
                priority: {
                  type: Type.STRING,
                  enum: ['High', 'Medium', 'Low'],
                },
                preconditions: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                expectedResult: { type: Type.STRING },
              },
              required: [
                'title',
                'category',
                'priority',
                'preconditions',
                'steps',
                'expectedResult',
              ],
            },
          },
        },
        required: ['testCases'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('AI model returned an empty response. Please try again.');
  }

  let parsed: { testCases?: unknown };
  try {
    parsed = JSON.parse(rawText) as { testCases?: unknown };
  } catch {
    throw new Error('AI response could not be parsed as valid JSON.');
  }

  const normalized = normalizeGeneratedCases(parsed.testCases, nextIdStart);
  if (normalized.length === 0) {
    throw new Error(
      'No valid structured test cases were produced. Please refine your requirement.'
    );
  }

  return normalized;
}

/**
 * Generates structured test cases via the hardened Express backend route
 * POST /api/generate-test-cases, falling back cleanly to a client-side
 * @google/genai call only when the backend API is unreachable (static hosting).
 */
export async function generateTestCases(
  rawRequirement: string,
  nextIdStart: number
): Promise<GenerationResult> {
  const validation = sanitizeRequirementInput(rawRequirement);
  if (!validation.valid) {
    throw new Error(validation.error || 'Please provide a valid requirement.');
  }

  let shouldTryClientFallback = false;

  try {
    const response = await fetch('/api/generate-test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validation.sanitized,
        nextIdStart,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // In static-only hosting (e.g. vite preview or CDN), /api/* returns 404/405 or index.html
    if (!isJson || response.status === 404 || response.status === 405) {
      shouldTryClientFallback = true;
    } else {
      const data = (await response.json().catch(() => ({}))) as {
        testCases?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || `Generation failed with status ${response.status}.`
        );
      }

      const normalized = normalizeGeneratedCases(data.testCases, nextIdStart);
      if (normalized.length === 0) {
        throw new Error('No test cases were returned. Try adding more detail.');
      }

      return { testCases: normalized, source: 'server' };
    }
  } catch (err: unknown) {
    // TypeError indicates network failure / unreachable backend route
    if (err instanceof TypeError) {
      shouldTryClientFallback = true;
    } else {
      throw err;
    }
  }

  if (shouldTryClientFallback) {
    const testCases = await generateWithClientFallback(
      validation.sanitized,
      nextIdStart
    );
    return { testCases, source: 'client-fallback' };
  }

  throw new Error('Unable to generate test cases.');
}
