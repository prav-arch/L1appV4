import { apiRequest } from './queryClient';
import { 
  Log, 
  AnalysisResult, 
  Activity, 
  Stats, 
  SearchResponse
} from './types';
import { API_BASE_URL } from '../config';

/**
 * Construct the full API URL
 */
const apiUrl = (path: string): string => {
  // Remove leading slash if present
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${normalizedPath}`;
};

export async function uploadLog(file: File): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(apiUrl('logs/upload'), {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }
  
  return response.json();
}

export async function getStats(): Promise<Stats> {
  const response = await fetch(apiUrl('stats'), {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  
  return response.json();
}

export async function getRecentActivities(limit: number = 10): Promise<Activity[]> {
  const response = await fetch(apiUrl(`activities?limit=${limit}`), {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }
  
  return response.json();
}

export async function getLogs(): Promise<Log[]> {
  const response = await fetch(apiUrl('logs'), {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  
  return response.json();
}

export async function getLog(id: number): Promise<Log> {
  const response = await fetch(apiUrl(`logs/${id}`), {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch log ${id}`);
  }
  
  return response.json();
}

export async function getAnalysisResult(logId: number): Promise<AnalysisResult> {
  const response = await fetch(apiUrl(`logs/${logId}/analysis`), {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch analysis for log ${logId}`);
  }
  
  return response.json();
}

export async function updateResolutionStatus(
  analysisId: number, 
  status: 'pending' | 'in_progress' | 'resolved'
): Promise<AnalysisResult> {
  const response = await fetch(apiUrl(`analysis/${analysisId}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update resolution status for analysis ${analysisId}`);
  }
  
  return response.json();
}

export async function semanticSearch(query: string): Promise<SearchResponse> {
  const response = await fetch(apiUrl('search'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to perform semantic search');
  }
  
  return response.json();
}
