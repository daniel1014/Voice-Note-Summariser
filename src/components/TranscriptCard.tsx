'use client';

import { useState } from 'react';
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
                    <button
                      onClick={() => setExpandedSummary(isExpanded ? null : model)}
                      className="w-full px-4 py-3 flex items-start justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">
                            {modelDisplayName(model)}
                          </h5>
                        </div>
                        {!!contentToShow && (
                          <p className={`mt-1 text-gray-600 leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {contentToShow}
                          </p>
                        )}
                        {isExpanded && (
                          <div className="mt-2 text-[10px] text-gray-400">
                            Generated {formatDateTime(modelSummaries[0]?.createdAt)}
                          </div>
                        )}
                      </div>
                      <div className={`ml-3 flex-shrink-0 transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
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