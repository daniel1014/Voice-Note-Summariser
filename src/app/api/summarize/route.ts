import { NextRequest, NextResponse } from 'next/server';
/**
 * High-level: Generate and persist summaries for a single transcript.
 * - HTTP semantics: POST only (side effects). Accepts 1–3 models via `models`.
 * - Behavior: Calls OpenRouter per model with concurrency limiting, persists each result,
 *   and returns per-model statuses. Partial failures are surfaced via `partial`.
 * - Why separate from GET /api/summaries: keeps read (idempotent) and write (non-idempotent)
 *   concerns clearly isolated; enables caching and safer retries for reads.
 */
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import pLimit from 'p-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SummarizeRequestSchema = z.object({
  transcriptId: z.string().min(1),
  models: z.array(z.string().min(1)).min(1).max(3),
  prompt: z.string().min(1).max(1000),
  temperature: z.number().min(0).max(1),
});

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface SummaryResult {
  model: string;
  status: 'ok' | 'error';
  persisted: boolean;
  summary?: {
    id: string;
    content: string;
    modelUsed: string;
    createdAt: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Concurrency limiter to prevent rate limiting from OpenRouter
const limit = pLimit(2);

async function callOpenRouter(
  model: string,
  prompt: string,
  transcriptContent: string,
  temperature: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
  
  try {
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Voice Note Summarizer',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes voice notes accurately and concisely.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nTranscript to summarize:\n${transcriptContent}`,
          },
        ],
        temperature: temperature,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error(`RATE_LIMIT:${errorData.error?.message || 'Rate limited'}`);
      } else if (response.status >= 500) {
        throw new Error(`SERVER_ERROR:${errorData.error?.message || 'Server error'}`);
      } else {
        throw new Error(`API_ERROR:${errorData.error?.message || response.statusText}`);
      }
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('NO_CONTENT:No content received from model');
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate and normalize input
    const parseResult = SummarizeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { transcriptId, models, prompt, temperature } = parseResult.data;

    // Deduplicate models
    const uniqueModels = [...new Set(models)];

    // Fetch transcript from database (only needed fields)
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      select: { id: true, content: true },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Process each model with concurrency control
    const summaryPromises = uniqueModels.map((model) =>
      limit(async (): Promise<SummaryResult> => {
        try {
          const content = await callOpenRouter(
            model,
            prompt,
            transcript.content,
            temperature,
            openRouterApiKey,
            request.signal
          );

          // Save summary to database
          const summary = await prisma.summary.create({
            data: {
              content,
              prompt,
              temperature,
              modelUsed: model,
              transcriptId,
            },
            select: {
              id: true,
              content: true,
              modelUsed: true,
              createdAt: true,
            },
          });

          return {
            model,
            status: 'ok',
            persisted: true,
            summary,
          };
        } catch (error) {
          console.error(`Error with model ${model}:`, error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const [code, message] = errorMessage.includes(':') 
            ? errorMessage.split(':', 2) 
            : ['UNKNOWN_ERROR', errorMessage];

          return {
            model,
            status: 'error',
            persisted: false,
            error: {
              code,
              message,
            },
          };
        }
      })
    );

    const results = await Promise.all(summaryPromises);
    const hasErrors = results.some(result => result.status === 'error');

    return NextResponse.json({
      success: true,
      partial: hasErrors,
      results,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}