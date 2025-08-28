'use client';

import { User } from '@/types';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { modelDisplayName } from '@/lib/format';

interface LeftPanelProps {
  selectedTranscriptIds: string[];
  onGenerateSummaries: (models: string[], prompt: string, temperature: number) => void;
  onBatchSummarizeAll: (models: string[], prompt: string, temperature: number) => void;
  isBatchProcessing: boolean;
  isGenerating: boolean;
  user: User;
  onLogout: () => void;
  selectedModels: string[];
  setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  temperature: number;
  setTemperature: React.Dispatch<React.SetStateAction<number>>;
}


export default function LeftPanel({
  selectedTranscriptIds,
  onGenerateSummaries,
  onBatchSummarizeAll,
  isBatchProcessing,
  isGenerating,
  user,
  onLogout,
  selectedModels,
  setSelectedModels,
  prompt,
  setPrompt,
  temperature,
  setTemperature,
}: LeftPanelProps) {

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

  const handleGenerateSummaries = () => {
    onGenerateSummaries(selectedModels, prompt, temperature);
  };

  const handleBatchSummarize = () => {
    onBatchSummarizeAll(selectedModels, prompt, temperature);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-semibold text-gray-900">Control Panel</h1>
          <button
            onClick={onLogout}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
        <p className="text-sm text-gray-600">Welcome, {user.username}</p>
      </div>

      {/* Controls */}
      <div className="flex-1 p-6 space-y-8">
        {/* Model Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Models (up to 3)
          </label>
          <div className="space-y-2">
            {AVAILABLE_MODELS.map((model) => (
              <label key={model} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelToggle(model)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
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
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGenerateSummaries}
            disabled={isGenerating || selectedModels.length === 0 || selectedTranscriptIds.length === 0}
            className="w-full py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generating Summaries...' : 'Generate Summaries'}
          </button>
          
          <button
            onClick={handleBatchSummarize}
            disabled={isBatchProcessing || selectedModels.length === 0}
            className="w-full py-3 px-4 border-2 border-orange-600 text-orange-600 font-medium rounded-lg hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBatchProcessing ? 'Processing All...' : 'Summarize All Transcripts'}
          </button>
        </div>
      </div>

      {/* Spacer to push buttons to bottom if needed */}
      <div className="flex-1"></div>
    </div>
  );
}