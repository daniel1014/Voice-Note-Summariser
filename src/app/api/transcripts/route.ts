import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * This route is used by VoiceNoteSummarizer.tsx to fetch transcripts from the database.
 */
export const runtime = 'nodejs';

export async function GET() {
  try {
    const transcripts = await prisma.transcript.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      transcripts,
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}