import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createRateLimiter,
  normalizeGeneratedCases,
  sanitizeRequirementInput,
} from './src/utils/coverageLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DIST_PATH = path.resolve(__dirname, 'dist');
const HAS_PROD_BUILD = fs.existsSync(path.join(DIST_PATH, 'index.html'));
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  (process.env.NODE_ENV !== 'development' && HAS_PROD_BUILD);

// Rate limiter configuration: max 15 requests per 60 seconds per IP
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

const ipRateLimiter = createRateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

const cleanupInterval = setInterval(() => {
  ipRateLimiter.cleanup();
}, 60_000);
cleanupInterval.unref();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const result = ipRateLimiter.check(ip);

  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSec));
    res.status(429).json({
      error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} requests per minute allowed. Please retry in ${result.retryAfterSec}s.`,
    });
    return;
  }

  next();
}

const TEST_CASE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    testCases: {
      type: Type.ARRAY,
      description:
        'A comprehensive set of structured SQA test cases covering Positive, Negative, Boundary, and Security scenarios.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Concise, specific test case title.',
          },
          category: {
            type: Type.STRING,
            enum: ['Positive', 'Negative', 'Boundary', 'Security'],
            description: 'The QA testing category.',
          },
          priority: {
            type: Type.STRING,
            enum: ['High', 'Medium', 'Low'],
            description: 'Risk-based execution priority.',
          },
          preconditions: {
            type: Type.STRING,
            description: 'Required system state, user role, or test fixtures prior to execution.',
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
            description: 'Ordered, concrete, reproducible execution steps (3 to 5 steps).',
          },
          expectedResult: {
            type: Type.STRING,
            description: 'Measurable, unambiguous expected outcome or assertion.',
          },
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
};

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Helmet-style security HTTP headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api') || req.headers['sec-fetch-dest'] !== 'iframe') {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    next();
  });

  // Strict 50kb JSON payload limit
  app.use(express.json({ limit: '50kb' }));

  // Handle oversized payloads & malformed JSON cleanly
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object') {
      const errorObj = err as { status?: number; type?: string };
      if (errorObj.status === 413 || errorObj.type === 'entity.too.large') {
        res.status(413).json({
          error: 'Request payload exceeds the 50kb maximum size limit.',
        });
        return;
      }
      if (errorObj.status === 400 && errorObj.type === 'entity.parse.failed') {
        res.status(400).json({
          error: 'Malformed JSON in request body.',
        });
        return;
      }
    }
    next(err);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post(
    '/api/generate-test-cases',
    rateLimitMiddleware,
    async (req: Request, res: Response) => {
      try {
        const body = req.body as { requirement?: unknown; nextIdStart?: unknown };
        const validation = sanitizeRequirementInput(body?.requirement);

        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
          res.status(503).json({
            error:
              'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets and try again.',
          });
          return;
        }

        const nextIdStart =
          typeof body?.nextIdStart === 'number' && Number.isInteger(body.nextIdStart)
            ? body.nextIdStart
            : 101;

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
          validation.sanitized,
        ].join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a Principal SQA Engineer specializing in test design, boundary value analysis, negative testing, and application security testing. Produce strictly structured, deterministic, high-signal test cases with zero fluff.',
            responseMimeType: 'application/json',
            responseSchema: TEST_CASE_RESPONSE_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          res.status(502).json({
            error: 'AI model returned an empty response. Please try again.',
          });
          return;
        }

        let parsed: { testCases?: unknown };
        try {
          parsed = JSON.parse(rawText) as { testCases?: unknown };
        } catch {
          res.status(502).json({
            error: 'AI response could not be parsed as valid JSON.',
          });
          return;
        }

        const testCases = normalizeGeneratedCases(parsed.testCases, nextIdStart);
        if (testCases.length === 0) {
          res.status(502).json({
            error: 'No valid structured test cases were produced. Please refine your requirement.',
          });
          return;
        }

        res.json({ testCases });
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = typeof err?.status === 'number' ? err.status : 500;

        if (status === 401 || status === 403) {
          res.status(status).json({
            error:
              'Gemini API authentication failed. Verify GEMINI_API_KEY in Settings > Secrets.',
          });
          return;
        }

        if (status === 429) {
          res.status(429).json({
            error: 'Gemini API quota exceeded. Please wait briefly and try again.',
          });
          return;
        }

        console.error('Error generating test cases:', err?.message || error);
        res.status(500).json({
          error:
            'Failed to generate test cases from the AI service. Please try again shortly.',
        });
      }
    }
  );

  if (IS_PROD) {
    app.use(express.static(DIST_PATH));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(DIST_PATH, 'index.html'));
        return;
      }
      next();
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `TestCase AI server (${IS_PROD ? 'production' : 'development'}) running at http://localhost:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start TestCase AI server:', err);
  process.exit(1);
});
