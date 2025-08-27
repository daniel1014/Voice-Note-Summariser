'use client';

import { useState, useEffect } from 'react';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import { User, Transcript, Summary } from '@/types';

interface VoiceNoteSummarizerProps {
  user: User;
  onLogout: () => void;
}

export default function VoiceNoteSummarizer({ user, onLogout }: VoiceNoteSummarizerProps) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [batchSummaries, setBatchSummaries] = useState<Summary[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Load transcripts on component mount
  useEffect(() => {
    loadTranscripts();
  }, []);

  // Load summaries when a transcript is selected
  useEffect(() => {
    if (selectedTranscript) {
      loadSummaries(selectedTranscript.id);
    } else {
      setSummaries([]);
    }
  }, [selectedTranscript]);

  const loadTranscripts = async () => {
    try {
      const response = await fetch('/api/transcripts');
      if (response.ok) {
        const data = await response.json();
        interface TranscriptResponse {
          id: string;
          title: string;
          content: string;
          createdAt: string;
        }
        const transcripts = data.transcripts?.map((t: TranscriptResponse) => ({
          ...t,
          createdAt: new Date(t.createdAt).toISOString()
        })) || [];
        setTranscripts(transcripts);
        if (transcripts.length > 0) {
          setSelectedTranscript(transcripts[0]);
        }
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummaries = async (transcriptId: string) => {
    try {
      const response = await fetch(`/api/summaries?transcriptId=${transcriptId}`);
      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  };

  const handleGenerateSummaries = async (
    models: string[],
    prompt: string,
    temperature: number
  ) => {
    if (!selectedTranscript) return;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId: selectedTranscript.id,
          models,
          prompt,
          temperature,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh summaries for the current transcript
        await loadSummaries(selectedTranscript.id);
        return data;
      } else {
        throw new Error(data.error || 'Failed to generate summaries');
      }
    } catch (error) {
      console.error('Error generating summaries:', error);
      throw error;
    }
  };

  const handleBatchSummarizeAll = async (
    models: string[],
    prompt: string,
    temperature: number
  ) => {
    if (models.length === 0 || !transcripts.length) return;

    setIsBatchProcessing(true);
    setBatchSummaries([]);

    try {
      const firstModel = models[0]; // Use the first selected model for batch processing
      const newBatchSummaries: Summary[] = [];

      // Process transcripts sequentially to avoid overwhelming the API
      for (const transcript of transcripts) {
        try {
          const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transcriptId: transcript.id,
              models: [firstModel],
              prompt,
              temperature,
            }),
          });

          const data = await response.json();
          
          if (data.success && data.results?.[0]?.summary) {
            newBatchSummaries.push({
              ...data.results[0].summary,
              transcriptTitle: transcript.title,
            } as Summary);
          }
        } catch (error) {
          console.error(`Error processing transcript ${transcript.title}:`, error);
        }
      }

      setBatchSummaries(newBatchSummaries);
      
      // Refresh summaries for currently selected transcript if any
      if (selectedTranscript) {
        await loadSummaries(selectedTranscript.id);
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transcripts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel */}
      <div className="w-96 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <LeftPanel
          transcripts={transcripts}
          selectedTranscript={selectedTranscript}
          onSelectTranscript={setSelectedTranscript}
          batchSummaries={batchSummaries}
          isBatchProcessing={isBatchProcessing}
          onBatchSummarizeAll={handleBatchSummarizeAll}
          user={user}
          onLogout={onLogout}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        <RightPanel
          selectedTranscript={selectedTranscript}
          summaries={summaries}
          onGenerateSummaries={handleGenerateSummaries}
        />
      </div>
    </div>
  );
}