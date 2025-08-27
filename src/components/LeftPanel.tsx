'use client';

import { useState } from 'react';
import { User, Transcript, Summary } from '@/types';
import { AVAILABLE_MODELS, DEFAULT_PROMPT } from '@/lib/constants';
import { formatDate, formatDateTime, modelDisplayName } from '@/lib/format';

interface LeftPanelProps {
  transcripts: Transcript[];
  selectedTranscript: Transcript | null;
  onSelectTranscript: (transcript: Transcript) => void;
  batchSummaries: Summary[];
  isBatchProcessing: boolean;
  onBatchSummarizeAll: (models: string[], prompt: string, temperature: number) => void;
  user: User;
  onLogout: () => void;
}


export default function LeftPanel({
  transcripts,
  selectedTranscript,
  onSelectTranscript,
  batchSummaries,
  isBatchProcessing,
  onBatchSummarizeAll,
  user,
  onLogout,
}: LeftPanelProps) {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0]);

  const handleBatchSummarize = () => {
    onBatchSummarizeAll([selectedModel], DEFAULT_PROMPT, 0.3);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-semibold text-gray-900">Voice Note Summarizer</h1>
          <button
            onClick={onLogout}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
        <p className="text-sm text-gray-600">Welcome, {user.username}</p>
      </div>

      {/* Transcript List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Transcripts</h2>
          <div className="space-y-2">
            {transcripts.map((transcript) => (
              <button
                key={transcript.id}
                onClick={() => onSelectTranscript(transcript)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTranscript?.id === transcript.id
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm truncate">{transcript.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(transcript.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Transcript Content */}
        {selectedTranscript && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Transcript</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-2">
                {selectedTranscript.title}
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedTranscript.content}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Batch Operations */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model for Batch Processing
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model} value={model}>
                  {modelDisplayName(model)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleBatchSummarize}
            disabled={isBatchProcessing || transcripts.length === 0}
            className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBatchProcessing ? 'Processing...' : 'Summarize All Transcripts'}
          </button>
        </div>

        {/* Batch Summary Display */}
        {batchSummaries.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Batch Summaries</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {batchSummaries.map((summary, index) => (
                <div key={summary.id} className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {summary.transcriptTitle || `Transcript ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-800 line-clamp-3">
                    {summary.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {modelDisplayName(summary.modelUsed)} • {formatDateTime(summary.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}