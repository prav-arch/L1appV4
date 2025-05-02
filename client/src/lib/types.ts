export interface Log {
  id: number;
  filename: string;
  originalContent: string;
  uploadedAt: Date;
  fileSize: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'completed_without_vectors' | 'error';
}

export interface Issue {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  firstOccurrence: string;
  status: 'pending' | 'in_progress' | 'fixed';
}

export interface Recommendation {
  title: string;
  description: string;
  category: 'configuration' | 'monitoring' | 'authentication' | 'network' | 'other';
  isAutomaticallyResolved: boolean;
  documentationLink?: string;
}

export interface AnalysisResult {
  id: number;
  logId: number;
  issues: Issue[];
  recommendations: Recommendation[];
  severity: 'low' | 'medium' | 'high';
  analysisDate: Date;
  resolutionStatus: 'pending' | 'in_progress' | 'resolved';
}

export interface Activity {
  id: number;
  logId?: number;
  activityType: 'upload' | 'processing' | 'analysis' | 'status_change' | 'error';
  description: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'resolved' | 'error';
}

export interface Stats {
  analyzedLogs: number;
  issuesResolved: number;
  pendingIssues: number;
  avgResolutionTime: string;
}

export interface SearchResult {
  logId: number;
  filename: string;
  text: string;
  score: number;
  relevance: string;
}

export interface SearchResponse {
  results: SearchResult[];
  summary: string;
}
