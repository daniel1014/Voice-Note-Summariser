'use client';

import { Transcript, Summary } from '@/types';
import TranscriptCard from './TranscriptCard';

interface RightPanelProps {
  transcripts: Transcript[];
  selectedTranscriptIds: string[];
  onToggleTranscriptSelection: (transcriptId: string) => void;
  summariesByTranscript: Record<string, Summary[]>;
  loadingModelsByTranscript: Record<string, string[]>;
  onGenerateSummary: (transcriptId: string) => void;
  isGenerating: boolean;
}


export default function RightPanel({
  transcripts,
  selectedTranscriptIds,
  onToggleTranscriptSelection,
  summariesByTranscript,
  loadingModelsByTranscript,
  onGenerateSummary,
  isGenerating,
}: RightPanelProps) {
  
  if (transcripts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">No transcripts available</div>
          <div className="text-sm">Please check your database connection</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Voice Transcripts
        </h2>
        <p className="text-sm text-gray-600">
          {selectedTranscriptIds.length > 0 
            ? `${selectedTranscriptIds.length} transcript${selectedTranscriptIds.length > 1 ? 's' : ''} selected`
            : 'Click on transcript cards to select them for summarization'
          }
        </p>
      </div>

      {/* Transcript Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transcripts.map((transcript) => (
            <TranscriptCard
              key={transcript.id}
              transcript={transcript}
              isSelected={selectedTranscriptIds.includes(transcript.id)}
              onToggleSelection={onToggleTranscriptSelection}
              summaries={summariesByTranscript[transcript.id] || []}
              loadingModels={loadingModelsByTranscript[transcript.id] || []}
              onGenerateSummary={onGenerateSummary}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      </div>
    </div>
  );
}