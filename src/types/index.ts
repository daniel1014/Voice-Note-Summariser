export interface User {
  id: string;
  username: string;
}

export interface Transcript {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Summary {
  id: string;
  content: string;
  modelUsed: string;
  createdAt: string;
  transcriptTitle?: string;
}

export interface SummaryResult {
  model: string;
  status: 'ok' | 'error';
  persisted: boolean;
  summary?: {
    id: string;
    content: string;
    modelUsed: string;
    createdAt: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GenerateResult {
  success: boolean;
  partial: boolean;
  results: SummaryResult[];
}