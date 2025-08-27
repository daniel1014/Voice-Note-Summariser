import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'transcriptId parameter is required' },
        { status: 400 }
      );
    }

    const summaries = await prisma.summary.findMany({
      where: {
        transcriptId: transcriptId,
      },
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