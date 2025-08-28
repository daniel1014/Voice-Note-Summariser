'use client';

import { useState, useRef, useEffect } from 'react';
import { Transcript, Summary } from '@/types';
import { formatDate, formatDateTime, modelDisplayName } from '@/lib/format';

interface TranscriptCardProps {
  transcript: Transcript;
  isSelected: boolean;
  onToggleSelection: (transcriptId: string) => void;
  summaries: Summary[];
  loadingModels: string[];
  onGenerateSummary: (transcriptId: string) => void;
  isGenerating?: boolean;
}

export default function TranscriptCard({
  transcript,
  isSelected,
  onToggleSelection,
  summaries,
  loadingModels,
  onGenerateSummary,
  isGenerating = false,
}: TranscriptCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioUrls = useRef<Map<string, string>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all audio and clean up resources
      audioRefs.current.forEach((audio, key) => {
        audio.pause();
        audio.currentTime = 0;
        const url = audioUrls.current.get(key);
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
      audioRefs.current.clear();
      audioUrls.current.clear();
    };
  }, []);
  
  // Get preview of first 2-3 lines
  const contentLines = transcript.content.split('\n');
  const previewLines = contentLines.slice(0, 2);
  const hasMore = contentLines.length > 2 || transcript.content.length > 150;
  
  const preview = hasMore 
    ? previewLines.join('\n').substring(0, 150) + '...'
    : transcript.content;

  // Group summaries by model
  const summariesByModel = summaries.reduce((acc, summary) => {
    if (!acc[summary.modelUsed]) {
      acc[summary.modelUsed] = [];
    }
    acc[summary.modelUsed].push(summary);
    return acc;
  }, {} as Record<string, Summary[]>);

  // Show summaries if we have any or if we're loading
  const showSummaryContainer = summaries.length > 0 || loadingModels.length > 0;

  // TTS functionality
  const handleTTS = async (summaryId: string, text: string) => {
    if (currentlyPlaying === summaryId) {
      // Stop current audio and clean up
      const currentAudio = audioRefs.current.get(summaryId);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      const url = audioUrls.current.get(summaryId);
      if (url) {
        URL.revokeObjectURL(url);
        audioUrls.current.delete(summaryId);
      }
      audioRefs.current.delete(summaryId);
      setCurrentlyPlaying(null);
      return;
    }

    setTtsLoading(summaryId);
    setTtsError(null);
    
    // Create an abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any currently playing audio and clean up URLs
      audioRefs.current.forEach((audio, key) => {
        if (key !== summaryId) {
          audio.pause();
          audio.currentTime = 0;
          const oldUrl = audioUrls.current.get(key);
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
            audioUrls.current.delete(key);
          }
          audioRefs.current.delete(key);
        }
      });
      setCurrentlyPlaying(null);
      
      // Create and play new audio
      const audio = new Audio(audioUrl);
      audioRefs.current.set(summaryId, audio);
      audioUrls.current.set(summaryId, audioUrl);
      
      audio.onloadeddata = async () => {
        setTtsLoading(null);
        setCurrentlyPlaying(summaryId);
        try {
          await audio.play();
        } catch (playError) {
          console.error('Audio play failed:', playError);
          setCurrentlyPlaying(null);
          setTtsError('Failed to play audio. Please try again.');
          URL.revokeObjectURL(audioUrl);
          audioRefs.current.delete(summaryId);
          audioUrls.current.delete(summaryId);
        }
      };
      
      audio.onended = () => {
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(audioUrl);
        audioRefs.current.delete(summaryId);
        audioUrls.current.delete(summaryId);
      };
      
      audio.onerror = () => {
        setTtsLoading(null);
        setCurrentlyPlaying(null);
        setTtsError('Audio playback failed. Please try again.');
        URL.revokeObjectURL(audioUrl);
        audioRefs.current.delete(summaryId);
        audioUrls.current.delete(summaryId);
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('TTS Error:', error);
      setTtsLoading(null);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setTtsError('Request timed out. Please try again.');
        } else {
          setTtsError(error.message || 'Failed to generate speech. Please try again.');
        }
      } else {
        setTtsError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-orange-500 shadow-md' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onToggleSelection(transcript.id)}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {transcript.title}
          </h3>
          {isSelected && (
            <div className="flex-shrink-0 ml-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          {formatDate(transcript.createdAt)}
        </div>

        {/* Content Preview */}
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className={`${showFullContent ? '' : 'line-clamp-3'}`}>
            {showFullContent ? transcript.content : preview}
          </p>
          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullContent(!showFullContent);
              }}
              className="text-orange-600 hover:text-orange-700 text-sm mt-1 font-medium"
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Generate Summary Button */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateSummary(transcript.id);
            }}
            disabled={isGenerating || loadingModels.length > 0}
            className="w-full py-2 px-3 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating || loadingModels.length > 0 ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              'Generate Summary'
            )}
          </button>
        </div>
      </div>

      {/* Summary Container */}
      {showSummaryContainer && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-4">
            {/* Why: compact, scannable section title to keep UI airy */}
            <h4 className="text-xs font-medium text-gray-900 mb-3 tracking-wide">Summaries</h4>
            
            {/* Error Message */}
            {ttsError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{ttsError}</p>
                    <button
                      onClick={() => setTtsError(null)}
                      className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Summary Rows */}
            <div className="space-y-2">
              {/* Existing summaries */}
              {Object.entries(summariesByModel).map(([model, modelSummaries]) => {
                const latest = modelSummaries[0];
                const isExpanded = expandedSummary === model;
                const rawPreview = (latest?.content || '').replace(/\s+/g, ' ').trim();
                const previewText = rawPreview.length > 160 ? rawPreview.slice(0, 160) + '…' : rawPreview;
                const contentToShow = isExpanded ? (latest?.content || '') : previewText;
                return (
                  <div key={model} className="bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900">
                            {modelDisplayName(model)}
                          </h5>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* TTS Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTTS(latest.id, latest.content);
                            }}
                            disabled={ttsLoading === latest.id}
                            className="flex items-center justify-center p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors disabled:opacity-50 min-w-[42px] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500"
                            aria-label={currentlyPlaying === latest.id ? 'Stop audio' : `Listen to ${modelDisplayName(model)} summary`}
                          >
                            {ttsLoading === latest.id ? (
                              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : currentlyPlaying === latest.id ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </button>
                          
                          {/* Expand Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSummary(isExpanded ? null : model);
                            }}
                            className="flex items-center justify-center p-1 text-gray-400 hover:text-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500"
                            aria-expanded={isExpanded}
                            aria-controls={`summary-content-${model}`}
                            aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
                          >
                            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {!!contentToShow && (
                        <div id={`summary-content-${model}`} className="mt-1">
                          <p className={`text-gray-600 leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {contentToShow}
                          </p>
                        </div>
                      )}
                      {isExpanded && (
                        <div className="mt-2 text-[10px] text-gray-400">
                          <time dateTime={modelSummaries[0]?.createdAt}>
                            Generated {formatDateTime(modelSummaries[0]?.createdAt)}
                          </time>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Loading placeholders */}
              {loadingModels
                .filter((model) => !summariesByModel[model])
                .map((model) => (
                  <div key={`loading-${model}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          {modelDisplayName(model)}
                          <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        </h5>
                        <div className="text-gray-500">Generating...</div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}