import { NextRequest, NextResponse } from 'next/server';
/**
 * High-level: Read-only access to persisted summaries from the local database (via Prisma).
 * - HTTP semantics: GET only (safe, idempotent). Supports optional model filtering via
 *   `?model=a&model=b` or `?models=a,b` to avoid mixing results from other runs.
 * - Why separate from POST /api/summarize: enables caching and safe retries, and prevents
 *   accidentally triggering new generations when the UI just needs to read data.
 *
 * This endpoint only reads from the local database using Prisma ORM and never triggers new summary generation.
 */
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');
    const modelParams = searchParams.getAll('model');
    const modelsCsv = searchParams.get('models');
    const requestedModels = new Set<string>();
    for (const m of modelParams) {
      const trimmed = m.trim();
      if (trimmed) requestedModels.add(trimmed);
    }
    if (modelsCsv) {
      for (const m of modelsCsv.split(',').map((s) => s.trim()).filter(Boolean)) {
        requestedModels.add(m);
      }
    }

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'transcriptId parameter is required' },
        { status: 400 }
      );
    }

    const whereClause: { transcriptId: string; modelUsed?: { in: string[] } } = { transcriptId };
    if (requestedModels.size > 0) {
      whereClause.modelUsed = { in: Array.from(requestedModels) };
    }

    const summaries = await prisma.summary.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        modelUsed: true,
        prompt: true,
        temperature: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      summaries,
    });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    );
  }
}