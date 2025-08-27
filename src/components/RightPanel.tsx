'use client';

import { useState, useMemo } from 'react';
import { Transcript, Summary, GenerateResult } from '@/types';
import { AVAILABLE_MODELS, DEFAULT_PROMPT, DEFAULT_TEMPERATURE } from '@/lib/constants';
import { formatDateTime, modelDisplayName } from '@/lib/format';

interface RightPanelProps {
  selectedTranscript: Transcript | null;
  summaries: Summary[];
  onGenerateSummaries: (models: string[], prompt: string, temperature: number) => Promise<GenerateResult>;
}


export default function RightPanel({ selectedTranscript, summaries, onGenerateSummaries }: RightPanelProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>([AVAILABLE_MODELS[0]]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<string[]>([]);

  const handleModelToggle = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m) => m !== model);
      } else if (prev.length < 3) {
        return [...prev, model];
      } else {
        return prev; // Max 3 models
      }
    });
  };

  const handleGenerateSummaries = async () => {
    if (!selectedTranscript || selectedModels.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setLoadingModels(selectedModels);

    try {
      const result = await onGenerateSummaries(selectedModels, prompt, temperature);
      
      if (result.partial) {
        // Some models had errors
        const errorModels = result.results
          ?.filter((r) => r.status === 'error')
          .map((r) => r.model);
        
        if (errorModels?.length > 0) {
          setError(`Some models failed: ${errorModels.join(', ')}`);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summaries');
    } finally {
      setIsGenerating(false);
      setLoadingModels([]);
    }
  };

  // Group summaries by model for comparison
  const summariesByModel = useMemo(() => {
    return summaries.reduce((acc, summary) => {
      if (!acc[summary.modelUsed]) {
        acc[summary.modelUsed] = [];
      }
      acc[summary.modelUsed].push(summary);
      return acc;
    }, {} as Record<string, Summary[]>);
  }, [summaries]);


  if (!selectedTranscript) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">Select a transcript to get started</div>
          <div className="text-sm">Choose a voice note from the left panel to view and generate summaries</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {selectedTranscript.title}
        </h2>
        <p className="text-sm text-gray-500">
          Created {formatDateTime(selectedTranscript.createdAt)}
        </p>
      </div>

      {/* Controls Section */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Model Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Models (up to 3)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AVAILABLE_MODELS.map((model) => (
                <label key={model} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model)}
                    onChange={() => handleModelToggle(model)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {modelDisplayName(model)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summarization Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your summarization instructions..."
            />
          </div>

          {/* Temperature Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative (0.0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGenerateSummaries}
              disabled={isGenerating || selectedModels.length === 0}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating Summaries...' : 'Generate Summaries'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summaries Comparison Section */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {summaries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No summaries yet</div>
              <div className="text-gray-500 text-sm">
                Generate summaries using the controls above
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Summary Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(summariesByModel).map(([model, modelSummaries]) => (
                  <div key={model} className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        {modelDisplayName(model)}
                        {loadingModels.includes(model) && (
                          <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        )}
                      </h4>
                    </div>
                    <div className="p-4">
                      {loadingModels.includes(model) ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {modelSummaries.slice(0, 1).map((summary) => (
                            <div key={summary.id}>
                              <p className="text-sm text-gray-800 leading-relaxed">
                                {summary.content}
                              </p>
                              <div className="mt-3 text-xs text-gray-500">
                                Generated {formatDateTime(summary.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Loading placeholders for selected models that are generating */}
                {loadingModels
                  .filter((model) => !summariesByModel[model])
                  .map((model) => (
                    <div key={`loading-${model}`} className="bg-white border border-gray-200 rounded-lg">
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          {modelDisplayName(model)}
                          <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}