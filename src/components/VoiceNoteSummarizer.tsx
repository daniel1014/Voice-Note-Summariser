'use client';

import { useState, useEffect } from 'react';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import { User, Transcript, Summary } from '@/types';
import { AVAILABLE_MODELS, DEFAULT_PROMPT, DEFAULT_TEMPERATURE } from '@/lib/constants';
import { useToast } from '@/components/ui/use-toast';

interface VoiceNoteSummarizerProps {
  user: User;
  onLogout: () => void;
}

export default function VoiceNoteSummarizer({ user, onLogout }: VoiceNoteSummarizerProps) {
  const { toast } = useToast();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<string[]>([]);
  const [summariesByTranscript, setSummariesByTranscript] = useState<Record<string, Summary[]>>({});
  const [loadingModelsByTranscript, setLoadingModelsByTranscript] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Lift up model selection state from LeftPanel
  const [selectedModels, setSelectedModels] = useState<string[]>([AVAILABLE_MODELS[0]]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);

  // Load transcripts on component mount
  useEffect(() => {
    loadTranscripts();
  }, []);

  // Note: Removed automatic summary loading on selection
  // Summaries are now only loaded when explicitly requested via generate buttons

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
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummaries = async (transcriptId: string, models?: string[]) => {
    try {
      const params = new URLSearchParams({ transcriptId });
      if (models && models.length > 0) {
        params.set('models', models.join(','));
      }
      const response = await fetch(`/api/summaries?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummariesByTranscript(prev => ({
          ...prev,
          [transcriptId]: data.summaries || []
        }));
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  };

  const handleToggleTranscriptSelection = (transcriptId: string) => {
    setSelectedTranscriptIds(prev => {
      if (prev.includes(transcriptId)) {
        return prev.filter(id => id !== transcriptId);
      } else {
        return [...prev, transcriptId];
      }
    });
  };

  const handleGenerateSummaries = async (
    models: string[],
    prompt: string,
    temperature: number
  ) => {
    if (selectedTranscriptIds.length === 0) return;

    setIsGenerating(true);

    // Set loading models for selected transcripts
    setLoadingModelsByTranscript(prev => {
      const updated = { ...prev };
      selectedTranscriptIds.forEach(id => {
        updated[id] = models;
      });
      return updated;
    });

    try {
      // Process each selected transcript
      for (const transcriptId of selectedTranscriptIds) {
        try {
          const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transcriptId,
              models,
              prompt,
              temperature,
            }),
          });

          const data = await response.json();
          
          if (data.success) {
            // Refresh summaries for this transcript (only for requested models)
            await loadSummaries(transcriptId, models);
          }
          // Show toast if partial errors (e.g., rate limit) even when success is true
          if (data?.partial && Array.isArray(data?.results)) {
            const rateLimitErrors = (data.results as any[]).filter(
              r => r?.status === 'error' && String(r?.error?.code || '').startsWith('RATE_LIMIT')
            );
            if (rateLimitErrors.length > 0) {
              const msg = rateLimitErrors[0]?.error?.message || 'Rate limit exceeded. Please try again later.';
              toast({
                title: 'Rate limit reached',
                description: msg,
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          console.error(`Error processing transcript ${transcriptId}:`, error);
        }
      }
    } finally {
      setIsGenerating(false);
      // Clear loading states
      setLoadingModelsByTranscript(prev => {
        const updated = { ...prev };
        selectedTranscriptIds.forEach(id => {
          updated[id] = [];
        });
        return updated;
      });
    }
  };

  const handleBatchSummarizeAll = async (
    models: string[],
    prompt: string,
    temperature: number
  ) => {
    if (models.length === 0 || transcripts.length === 0) return;

    setIsBatchProcessing(true);

    // Set loading models for all transcripts
    const allLoadingModels: Record<string, string[]> = {};
    transcripts.forEach(transcript => {
      allLoadingModels[transcript.id] = models;
    });
    setLoadingModelsByTranscript(allLoadingModels);

    try {
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
              models,
              prompt,
              temperature,
            }),
          });

          const data = await response.json();
          
          if (data.success) {
            // Refresh summaries for this transcript (only for requested models)
            await loadSummaries(transcript.id, models);
          }

          // Clear loading for this transcript
          setLoadingModelsByTranscript(prev => ({
            ...prev,
            [transcript.id]: []
          }));
        } catch (error) {
          console.error(`Error processing transcript ${transcript.title}:`, error);
          // Clear loading for this transcript even on error
          setLoadingModelsByTranscript(prev => ({
            ...prev,
            [transcript.id]: []
          }));
        }
      }
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleGenerateSummaryForTranscript = async (transcriptId: string) => {
    if (selectedModels.length === 0) return;

    setIsGenerating(true);

    // Set loading models for this specific transcript using current selected models
    setLoadingModelsByTranscript(prev => ({
      ...prev,
      [transcriptId]: selectedModels
    }));

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId,
          models: selectedModels,
          prompt,
          temperature,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh summaries for this transcript (only for requested models)
        await loadSummaries(transcriptId, selectedModels);
      }
      if (data?.partial && Array.isArray(data?.results)) {
        const rateLimitErrors = (data.results as any[]).filter(
          r => r?.status === 'error' && String(r?.error?.code || '').startsWith('RATE_LIMIT')
        );
        if (rateLimitErrors.length > 0) {
          const msg = rateLimitErrors[0]?.error?.message || 'Rate limit exceeded. Please try again later.';
          toast({
            title: 'Rate limit reached',
            description: msg,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error(`Error processing transcript ${transcriptId}:`, error);
    } finally {
      setIsGenerating(false);
      // Clear loading state
      setLoadingModelsByTranscript(prev => ({
        ...prev,
        [transcriptId]: []
      }));
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
      {/* Left Panel - Control Panel */}
      <div className="w-96 flex-shrink-0">
        <LeftPanel
          selectedTranscriptIds={selectedTranscriptIds}
          onGenerateSummaries={handleGenerateSummaries}
          onBatchSummarizeAll={handleBatchSummarizeAll}
          isBatchProcessing={isBatchProcessing}
          isGenerating={isGenerating}
          user={user}
          onLogout={onLogout}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          prompt={prompt}
          setPrompt={setPrompt}
          temperature={temperature}
          setTemperature={setTemperature}
        />
      </div>

      {/* Right Panel - Transcript Grid */}
      <div className="flex-1">
        <RightPanel
          transcripts={transcripts}
          selectedTranscriptIds={selectedTranscriptIds}
          onToggleTranscriptSelection={handleToggleTranscriptSelection}
          summariesByTranscript={summariesByTranscript}
          loadingModelsByTranscript={loadingModelsByTranscript}
          onGenerateSummary={handleGenerateSummaryForTranscript}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}