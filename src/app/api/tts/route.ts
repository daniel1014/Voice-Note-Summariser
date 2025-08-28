import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Initialize ElevenLabs client lazily to handle missing API key gracefully
let elevenlabs: ElevenLabsClient | null = null;

function getElevenLabsClient() {
  if (!elevenlabs) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }
    elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return elevenlabs;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    // Input validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Valid text is required' },
        { status: 400 }
      );
    }

    // Limit text length for performance and cost control
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed' },
        { status: 400 }
      );
    }

    const client = getElevenLabsClient();
    
    // Use a default voice if none provided
    const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice

    // Convert text to speech
    const audio = await client.textToSpeech.convert(selectedVoiceId, {
      text: text,
      outputFormat: 'mp3_44100_128',
      modelId: 'eleven_multilingual_v2',
    });

    // Convert ReadableStream to buffer
    const chunks: Uint8Array[] = [];
    const reader = audio.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    const audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to generate speech', details: errorMessage },
      { status: 500 }
    );
  }
}

// Optional: Get available voices
export async function GET() {
  try {
    const client = getElevenLabsClient();
    const voices = await client.voices.getAll();
    
    return NextResponse.json({
      voices: voices.voices?.map(voice => ({
        voice_id: voice.voiceId,
        name: voice.name,
        category: voice.category,
        description: voice.description,
      })) || []
    });
  } catch (error) {
    console.error('Failed to fetch voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available voices' },
      { status: 500 }
    );
  }
}