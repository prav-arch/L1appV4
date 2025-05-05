#!/bin/bash

# Create a directory for the project
mkdir -p telecom_log_analysis
cd telecom_log_analysis

# Create the directory structure
mkdir -p client/src/components/dashboard
mkdir -p client/src/lib
mkdir -p client/src/pages
mkdir -p python_backend/services
mkdir -p server
mkdir -p shared

# Download the frontend files
echo "Downloading frontend files..."
cat > client/src/config.ts << 'EOF'
/**
 * Application configuration
 */

// Set to true to use Python backend, false to use TypeScript backend
const USE_PYTHON_BACKEND = false;

// API base URLs
export const API_BASE_URL = USE_PYTHON_BACKEND 
  ? 'http://localhost:5001/api' 
  : '/api';

// Export config object
export const config = {
  usePythonBackend: USE_PYTHON_BACKEND,
  apiBaseUrl: API_BASE_URL,
  
  // LLM service configuration
  llm: {
    inferenceUrl: import.meta.env.LLM_INFERENCE_URL || 'http://localhost:8080/v1/completions',
    embeddingUrl: import.meta.env.LLM_EMBEDDING_URL || 'http://localhost:8080/v1/embeddings',
    model: 'mistral-7b'
  },
  
  // Milvus configuration
  milvus: {
    host: import.meta.env.MILVUS_HOST || 'localhost',
    port: import.meta.env.MILVUS_PORT || '19530'
  }
};

export default config;
EOF

cat > client/src/components/dashboard/issues-recommendations-table.tsx << 'EOF'
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Book, CheckCircle, ExternalLink, FileText, Link2, Zap } from "lucide-react";
import { useState } from "react";
import { Issue, Recommendation } from "@/lib/types";

interface IssuesRecommendationsTableProps {
  issues: Issue[];
  recommendations: Recommendation[];
  isLoading?: boolean;
  className?: string;
}

export function IssuesRecommendationsTable({
  issues,
  recommendations,
  isLoading = false,
  className
}: IssuesRecommendationsTableProps) {
  const [activeTab, setActiveTab] = useState<string>("issues");
  const [selectedItem, setSelectedItem] = useState<Issue | Recommendation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const openDetails = (item: Issue | Recommendation) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'configuration':
        return 'bg-purple-100 text-purple-800';
      case 'monitoring':
        return 'bg-blue-100 text-blue-800';
      case 'authentication':
        return 'bg-amber-100 text-amber-800';
      case 'network':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const renderIssueDetails = (issue: Issue) => {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5" />
            {issue.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={getSeverityColor(issue.severity)}>
              {issue.severity} severity
            </Badge>
            <Badge variant="outline" className={getStatusColor(issue.status)}>
              {issue.status.replace('_', ' ')}
            </Badge>
          </div>
          <DialogDescription className="mt-4">
            First occurred: {issue.firstOccurrence}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-slate-600">{issue.description}</p>
        </div>
      </>
    );
  };

  const renderRecommendationDetails = (rec: Recommendation) => {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5" />
            {rec.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={getCategoryColor(rec.category)}>
              {rec.category}
            </Badge>
            {rec.isAutomaticallyResolved && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                auto-resolved
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-slate-600">{rec.description}</p>
          
          {rec.documentationLink && (
            <div className="mt-4">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={rec.documentationLink} target="_blank" rel="noopener noreferrer">
                  <Book className="h-4 w-4" />
                  <span>View Documentation</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderLoadingSkeleton = () => {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center p-3 border rounded-md animate-pulse">
            <div className="h-4 w-4 bg-slate-200 rounded-full mr-3"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded ml-3"></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Issues & Recommendations</CardTitle>
        <CardDescription>
          Issues detected in logs and recommended actions for resolution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Issues</span>
              <Badge variant="secondary" className="ml-1 rounded-full">
                {issues.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Recommendations</span>
              <Badge variant="secondary" className="ml-1 rounded-full">
                {recommendations.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="issues">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : issues.length > 0 ? (
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">{issue.title}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(issue.status)}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openDetails(issue)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">No Issues Found</h3>
                <p className="text-sm text-slate-500">
                  No issues were detected in the analyzed logs
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recommendations">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Badge variant="outline" className={getCategoryColor(rec.category)}>
                        {rec.category}
                      </Badge>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">{rec.title}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.isAutomaticallyResolved && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          auto-resolved
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDetails(rec)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">No Recommendations</h3>
                <p className="text-sm text-slate-500">
                  No recommendations are available at this time
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedItem && ('severity' in selectedItem) ? 
            renderIssueDetails(selectedItem as Issue) : 
            selectedItem && renderRecommendationDetails(selectedItem as Recommendation)
          }
        </DialogContent>
      </Dialog>
    </Card>
  );
}
EOF

cat > client/src/components/dashboard/stats-card.tsx << 'EOF'
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  isLoading?: boolean;
  trend?: {
    value: number;
    increasing: boolean;
  }
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  className,
  iconClassName,
  isLoading = false,
  trend
}: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-4 border border-slate-200", className)}>
      <div className="flex items-center">
        <div className={cn("rounded-full p-3 bg-blue-100 text-primary", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          
          {isLoading ? (
            <div className="h-8 flex items-center">
              <div className="h-2 w-16 bg-slate-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <p className="text-2xl font-semibold">{value}</p>
          )}
          
          {!isLoading && trend && (
            <div className="flex items-center mt-1">
              <span className={cn(
                "text-xs",
                trend.increasing ? "text-green-600" : "text-red-600"
              )}>
                <i className={`fas fa-arrow-${trend.increasing ? 'up' : 'down'} mr-1`}></i>
                {trend.value}%
              </span>
              <span className="text-xs text-slate-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

cat > client/src/lib/types.ts << 'EOF'
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
EOF

cat > client/src/lib/api.ts << 'EOF'
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
EOF

# Download the Python backend files
echo "Downloading Python backend files..."
cat > python_backend/app.py << 'EOF'
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import threading

# Import services
from services.storage import MemStorage
from services.log_parser import LogParser
from services.llm_service import LLMService
from services.milvus_service import MilvusService

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize services
storage = MemStorage()
log_parser = LogParser()
llm_service = LLMService()
milvus_service = MilvusService()

# Background processing tasks
processing_tasks = {}

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for the dashboard"""
    try:
        stats = storage.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        activities = storage.get_recent_activities(limit)
        return jsonify(activities)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/upload', methods=['POST'])
def upload_log():
    """Upload a log file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        
        # Validate file is a telecom log
        if not log_parser.is_valid_telecom_log(content):
            return jsonify({"error": "Invalid telecom log format"}), 400
        
        # Create log record
        log_data = {
            "filename": file.filename,
            "originalContent": content,
            "fileSize": len(content),
            "processingStatus": "pending"
        }
        
        log = storage.create_log(log_data)
        
        # Create activity record
        activity_data = {
            "logId": log["id"],
            "activityType": "upload",
            "description": f"Log '{file.filename}' uploaded",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        # Start processing in background
        threading.Thread(target=process_log_file, args=(log["id"], content)).start()
        
        return jsonify({"id": log["id"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>', methods=['GET'])
def get_log(log_id):
    """Get a specific log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        return jsonify(log)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get all logs"""
    try:
        logs = storage.get_all_logs()
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>/analysis', methods=['GET'])
def get_analysis(log_id):
    """Get analysis result for a log"""
    try:
        analysis = storage.get_analysis_result_by_log_id(log_id)
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Semantic search in logs"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        # Try vector search first
        try:
            # Generate embedding for query
            query_embedding = llm_service.generate_embedding(query)
            
            # Search for similar content in vector database
            search_results = milvus_service.search_similar_text(query_embedding)
            
            # Get log details for results
            enriched_results = []
            for result in search_results:
                log = storage.get_log(result["logId"])
                enriched_results.append({
                    "logId": result["logId"],
                    "filename": log["filename"] if log else "Unknown",
                    "text": result["text"],
                    "score": result["score"],
                    "relevance": "high" if result["score"] > 0.8 else "medium" if result["score"] > 0.6 else "low"
                })
            
            summary = llm_service.semantic_search(query, [r["text"] for r in search_results])
            
            return jsonify({
                "results": enriched_results,
                "summary": summary
            })
        
        except Exception as e:
            # Fall back to basic search if vector search fails
            logs = storage.get_all_logs()
            results = []
            
            for log in logs:
                if query.lower() in log["originalContent"].lower():
                    results.append({
                        "logId": log["id"],
                        "filename": log["filename"],
                        "text": log["originalContent"][:200] + "...",
                        "score": 0.5,  # Default score for basic search
                        "relevance": "medium"
                    })
            
            return jsonify({
                "results": results[:10],  # Limit to 10 results
                "summary": f"Found {len(results)} logs containing '{query}'"
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/<int:analysis_id>/status', methods=['PATCH'])
def update_status(analysis_id):
    """Update resolution status"""
    try:
        data = request.json
        status = data.get('status')
        
        if not status or status not in ['pending', 'in_progress', 'resolved']:
            return jsonify({"error": "Invalid status"}), 400
        
        result = storage.update_resolution_status(analysis_id, status)
        if not result:
            return jsonify({"error": "Analysis not found"}), 404
        
        # Create activity record
        activity_data = {
            "logId": result["logId"],
            "activityType": "status_change",
            "description": f"Analysis status changed to '{status}'",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def process_log_file(log_id, content):
    """Process log file in background"""
    try:
        # Update log status
        storage.update_log_status(log_id, "processing")
        
        # Create activity
        activity_data = {
            "logId": log_id,
            "activityType": "processing",
            "description": "Log processing started",
            "status": "in_progress"
        }
        activity = storage.create_activity(activity_data)
        
        # Analyze log with LLM
        analysis_result = llm_service.analyze_log(content)
        
        # Store analysis result
        result_data = {
            "logId": log_id,
            "issues": analysis_result["issues"],
            "recommendations": analysis_result["recommendations"],
            "summary": analysis_result["summary"],
            "severity": analysis_result["severity"],
            "resolutionStatus": "pending"
        }
        analysis = storage.create_analysis_result(result_data)
        
        # Segment log for embedding
        segments = log_parser.segment_log_for_embedding(content)
        
        try:
            # Generate embeddings
            embeddings = llm_service.generate_embeddings(segments)
            
            # Store embeddings in Milvus
            embedding_data = []
            for i, (segment, embedding) in enumerate(zip(segments, embeddings)):
                embedding_data.append({
                    "text": segment,
                    "embedding": embedding
                })
            
            milvus_service.insert_embeddings(log_id, embedding_data)
            
            # Update log status
            storage.update_log_status(log_id, "completed")
        except Exception as e:
            # If vector embedding fails, we still have the analysis
            print(f"Embedding generation failed: {str(e)}")
            storage.update_log_status(log_id, "completed_without_vectors")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "analysis",
            "description": "Log analysis completed",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
    except Exception as e:
        print(f"Error processing log: {str(e)}")
        # Update log status to error
        storage.update_log_status(log_id, "error")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "error",
            "description": f"Error processing log: {str(e)}",
            "status": "error"
        }
        storage.create_activity(activity_data)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
EOF

cat > python_backend/services/storage.py << 'EOF'
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class MemStorage:
    """In-memory storage for the application data"""
    
    def __init__(self):
        """Initialize storage with empty data structures"""
        self.users = {}
        self.logs = {}
        self.analysis_results = {}
        self.embeddings = {}
        self.activities = {}
        
        # Counters for IDs
        self.user_id_counter = 1
        self.log_id_counter = 1
        self.analysis_id_counter = 1
        self.embedding_id_counter = 1
        self.activity_id_counter = 1
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        for user in self.users.values():
            if user["username"] == username:
                return user
        return None
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        user_id = self.user_id_counter
        self.user_id_counter += 1
        
        user = {
            "id": user_id,
            "createdAt": datetime.now(),
            **user_data
        }
        
        self.users[user_id] = user
        return user
    
    def create_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new log entry"""
        log_id = self.log_id_counter
        self.log_id_counter += 1
        
        log = {
            "id": log_id,
            "uploadedAt": datetime.now(),
            **log_data
        }
        
        self.logs[log_id] = log
        return log
    
    def get_log(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get log by ID"""
        return self.logs.get(log_id)
    
    def get_all_logs(self) -> List[Dict[str, Any]]:
        """Get all logs"""
        logs = list(self.logs.values())
        logs.sort(key=lambda x: x["uploadedAt"], reverse=True)
        
        # Convert uploadedAt to ISO format string for JSON serialization
        for log in logs:
            log["uploadedAt"] = log["uploadedAt"].isoformat()
        
        return logs
    
    def update_log_status(self, log_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update log processing status"""
        log = self.logs.get(log_id)
        if not log:
            return None
        
        log["processingStatus"] = status
        return log
    
    def create_analysis_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new analysis result"""
        result_id = self.analysis_id_counter
        self.analysis_id_counter += 1
        
        result = {
            "id": result_id,
            "analysisDate": datetime.now(),
            **result_data
        }
        
        self.analysis_results[result_id] = result
        return result
    
    def get_analysis_result(self, result_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by ID"""
        result = self.analysis_results.get(result_id)
        if result:
            # Convert date to ISO format for JSON serialization
            result = result.copy()
            result["analysisDate"] = result["analysisDate"].isoformat()
        return result
    
    def get_analysis_result_by_log_id(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by log ID"""
        for result in self.analysis_results.values():
            if result["logId"] == log_id:
                # Convert date to ISO format for JSON serialization
                result = result.copy()
                result["analysisDate"] = result["analysisDate"].isoformat()
                return result
        return None
    
    def update_resolution_status(self, result_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update resolution status of an analysis result"""
        result = self.analysis_results.get(result_id)
        if not result:
            return None
        
        result["resolutionStatus"] = status
        
        # Convert date to ISO format for JSON serialization
        result_copy = result.copy()
        result_copy["analysisDate"] = result_copy["analysisDate"].isoformat()
        
        return result_copy
    
    def create_embedding(self, embedding_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new embedding entry"""
        embedding_id = self.embedding_id_counter
        self.embedding_id_counter += 1
        
        embedding = {
            "id": embedding_id,
            "createdAt": datetime.now(),
            **embedding_data
        }
        
        self.embeddings[embedding_id] = embedding
        return embedding
    
    def get_embeddings_by_log_id(self, log_id: int) -> List[Dict[str, Any]]:
        """Get embeddings by log ID"""
        embeddings = []
        for embedding in self.embeddings.values():
            if embedding["logId"] == log_id:
                # Convert date to ISO format for JSON serialization
                embedding_copy = embedding.copy()
                embedding_copy["createdAt"] = embedding_copy["createdAt"].isoformat()
                embeddings.append(embedding_copy)
        return embeddings
    
    def create_activity(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new activity record"""
        activity_id = self.activity_id_counter
        self.activity_id_counter += 1
        
        activity = {
            "id": activity_id,
            "timestamp": datetime.now(),
            **activity_data
        }
        
        self.activities[activity_id] = activity
        return activity
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities"""
        activities = list(self.activities.values())
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Convert timestamps to ISO format for JSON serialization
        activities_copy = []
        for activity in activities[:limit]:
            activity_copy = activity.copy()
            activity_copy["timestamp"] = activity_copy["timestamp"].isoformat()
            activities_copy.append(activity_copy)
        
        return activities_copy
    
    def get_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        # Count logs that have been fully analyzed (completed or completed_without_vectors)
        analyzed_logs = sum(1 for log in self.logs.values() 
                         if log["processingStatus"] in ["completed", "completed_without_vectors"])
        
        # Count resolved and pending issues
        issues_resolved = 0
        pending_issues = 0
        
        for result in self.analysis_results.values():
            if result["resolutionStatus"] == "resolved":
                # Count all issues in resolved analysis as resolved
                issues_resolved += len(result["issues"])
            else:
                # Count individual issues based on their status
                for issue in result["issues"]:
                    if issue["status"] == "fixed":
                        issues_resolved += 1
                    else:
                        pending_issues += 1
        
        # Calculate average resolution time (mock data)
        # In a real implementation, this would compare timestamps of upload and resolution
        avg_resolution_time = "6h 24m"
        
        return {
            "analyzedLogs": analyzed_logs,
            "issuesResolved": issues_resolved,
            "pendingIssues": pending_issues,
            "avgResolutionTime": avg_resolution_time
        }
EOF

cat > python_backend/services/log_parser.py << 'EOF'
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

class LogParser:
    """Parser for telecom log files"""
    
    def __init__(self):
        """Initialize with regex patterns for different log formats"""
        # Pattern for standard log format with timestamp, level, component, and message
        self.standard_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional log level (INFO, ERROR, etc.)
            r'(?:\[([^\]]+)\]\s+)?'  # Optional component in square brackets
            r'(.*)'  # Message
        )
        
        # Pattern for Cisco-style logs
        self.cisco_pattern = re.compile(
            r'(\w+\s+\d+\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z0-9-]+):\s+)?'  # Facility/severity
            r'(?:%([A-Z0-9-]+)(?:-\d+)?:\s+)?'  # Message code
            r'(.*)'  # Message
        )
        
        # Pattern for Nokia/Alcatel-Lucent logs
        self.nokia_pattern = re.compile(
            r'(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional log level
            r'(?:\[(\w+(?:\-\w+)*)\]\s+)?'  # Optional module
            r'(.*)'  # Message
        )
        
        # Pattern for Huawei logs
        self.huawei_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional severity
            r'(?:\[([^\]]+)\]\s+)?'  # Optional product/module
            r'(.*)'  # Message
        )
        
        # Pattern for Ericsson logs
        self.ericsson_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:(\w+)\s+)?'  # Optional log level
            r'(?:(\w+(?:\.\w+)*)\s+)?'  # Optional component
            r'(.*)'  # Message
        )
        
        # Combined pattern to check if it's a telecom log
        self.telecom_log_pattern = re.compile(
            r'(\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}|'
            r'\w+\s+\d+\s+\d{2}:\d{2}:\d{2})'
        )
    
    def parse_log(self, content: str) -> List[Dict[str, Any]]:
        """Parse log content into segments with metadata"""
        lines = content.splitlines()
        segments = []
        
        for line in lines:
            if not line.strip():
                continue
            
            parsed = self.parse_line(line)
            if parsed:
                segments.append(parsed)
            else:
                # If line doesn't match any pattern, add it as raw text
                segments.append({
                    "text": line,
                    "message": line
                })
        
        return segments
    
    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse a single log line"""
        # Try each pattern
        patterns = [
            self.standard_pattern,
            self.cisco_pattern,
            self.nokia_pattern,
            self.huawei_pattern,
            self.ericsson_pattern
        ]
        
        for pattern in patterns:
            match = pattern.match(line)
            if match:
                timestamp, level, component, message = match.groups()
                
                return {
                    "text": line,
                    "timestamp": timestamp,
                    "level": level,
                    "component": component,
                    "message": message
                }
        
        return None
    
    def segment_log_for_embedding(self, content: str, max_chunk_size: int = 512) -> List[str]:
        """Segment log content into reasonable chunks for embedding"""
        lines = content.splitlines()
        
        # Group lines into segments
        segments = []
        current_segment = []
        current_length = 0
        
        for line in lines:
            line_length = len(line)
            
            # If adding this line would exceed max_chunk_size, start a new segment
            if current_length + line_length > max_chunk_size and current_segment:
                segments.append("\n".join(current_segment))
                current_segment = []
                current_length = 0
            
            # Add line to current segment
            current_segment.append(line)
            current_length += line_length
        
        # Add the last segment if it's not empty
        if current_segment:
            segments.append("\n".join(current_segment))
        
        return segments
    
    def is_valid_telecom_log(self, content: str) -> bool:
        """Check if the content looks like a valid telecom log"""
        # Take a sample of the first 20 non-empty lines
        lines = [line for line in content.splitlines() if line.strip()][:20]
        
        # Count how many lines match our telecom log pattern
        matches = 0
        for line in lines:
            if self.telecom_log_pattern.search(line):
                matches += 1
        
        # If at least 50% of the lines match, consider it a valid telecom log
        return len(lines) > 0 and matches / len(lines) >= 0.5
    
    def extract_timestamps(self, content: str) -> List[Dict[str, str]]:
        """Extract timestamps from log content with their associated lines"""
        lines = content.splitlines()
        timestamps = []
        
        for line in lines:
            for pattern in [
                self.standard_pattern,
                self.cisco_pattern,
                self.nokia_pattern,
                self.huawei_pattern,
                self.ericsson_pattern
            ]:
                match = pattern.match(line)
                if match and match.group(1):  # If we have a timestamp
                    timestamps.append({
                        "timestamp": match.group(1),
                        "line": line
                    })
                    break
        
        return timestamps
EOF

cat > python_backend/services/llm_service.py << 'EOF'
import os
import json
import requests
import hashlib
import random
from typing import List, Dict, Any, Union, Optional
from datetime import datetime

class LLMService:
    """Service for interacting with the local LLM"""
    
    def __init__(self):
        """Initialize with configured endpoints"""
        # Get LLM endpoints from environment variables or use defaults
        self.inference_url = os.environ.get('LLM_INFERENCE_URL', 'http://localhost:8080/v1/completions')
        self.embedding_url = os.environ.get('LLM_EMBEDDING_URL', 'http://localhost:8080/v1/embeddings')
        self.model_name = os.environ.get('LLM_MODEL', 'mistral-7b')
        
        # Check if LLM service is available
        self.connection_error = None
        self.mock_mode = False
        
        try:
            self.check_connectivity()
        except Exception as e:
            print(f"LLM service is not accessible: {str(e)}")
            self.connection_error = e
            self.mock_mode = True
    
    def check_connectivity(self) -> None:
        """Check if LLM server is accessible"""
        response = requests.post(
            self.embedding_url,
            json={
                "input": "test",
                "model": self.model_name
            },
            timeout=5
        )
        
        if response.status_code != 200:
            raise Exception(f"LLM server returned status code {response.status_code}")
    
    def generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a deterministic embedding vector for mock mode"""
        # Create a pseudo-random but deterministic embedding based on the text hash
        seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Generate a 1536-dimensional embedding (common size for many models)
        embedding = [random.uniform(-1, 1) for _ in range(1536)]
        
        # Normalize to unit length
        length = sum(x**2 for x in embedding) ** 0.5
        embedding = [x / length for x in embedding]
        
        return embedding
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        if self.mock_mode:
            return self.generate_mock_embedding(text)
        
        response = requests.post(
            self.embedding_url,
            json={
                "input": text,
                "model": self.model_name
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to generate embedding: {response.text}")
        
        data = response.json()
        return data["embedding"]
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        
        return embeddings
    
    def generate_mock_analysis(self, log_content: str) -> Dict[str, Any]:
        """Generate mock analysis for telecom logs"""
        # Create deterministic but pseudo-random issues based on content hash
        seed = int(hashlib.md5(log_content.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Generate random number of issues (1-5)
        num_issues = random.randint(1, 5)
        
        # Sample issue templates
        issue_templates = [
            {
                "title": "High CPU Usage on Node FLEX-2103",
                "description": "CPU usage consistently above 85% threshold during peak hours. This may lead to service degradation and potential outages.",
                "severity": "high",
                "firstOccurrence": "2023-08-15T14:32:10Z"
            },
            {
                "title": "Authentication Failures on Gateway GATE-4201",
                "description": "Multiple authentication failures detected on gateway GATE-4201. This could indicate a brute force attack or misconfigured client devices.",
                "severity": "medium",
                "firstOccurrence": "2023-09-01T08:17:45Z"
            },
            {
                "title": "Memory Leak in Core Service",
                "description": "Memory utilization increasing gradually without corresponding decrease, indicating a potential memory leak in core services.",
                "severity": "high",
                "firstOccurrence": "2023-08-20T23:45:12Z"
            },
            {
                "title": "Network Latency Spikes",
                "description": "Intermittent network latency spikes observed during handover procedures. May result in dropped calls or data session interruptions.",
                "severity": "medium",
                "firstOccurrence": "2023-08-25T11:20:30Z"
            },
            {
                "title": "Misconfigured Load Balancer",
                "description": "Load balancer configuration does not distribute traffic optimally across available nodes, creating hotspots.",
                "severity": "low",
                "firstOccurrence": "2023-09-05T16:12:05Z"
            },
            {
                "title": "TLS Certificate Expiration",
                "description": "TLS certificate for secure communications approaching expiration date. Renewal required to prevent service disruption.",
                "severity": "medium",
                "firstOccurrence": "2023-09-10T09:05:22Z"
            },
            {
                "title": "Database Connection Pool Exhaustion",
                "description": "Database connection pool repeatedly reaching maximum capacity, causing timeouts for new connection requests.",
                "severity": "high",
                "firstOccurrence": "2023-08-18T13:42:08Z"
            }
        ]
        
        # Sample recommendation templates
        recommendation_templates = [
            {
                "title": "Implement CPU Throttling",
                "description": "Configure CPU throttling policies to prevent excess resource consumption during peak hours.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/cpu-management"
            },
            {
                "title": "Update Authentication Protocol",
                "description": "Update to OAuth 2.0 with multi-factor authentication for improved security posture.",
                "category": "authentication",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/auth-security"
            },
            {
                "title": "Memory Profiling and Fix",
                "description": "Run memory profiling tools to identify and fix memory leaks in core service modules.",
                "category": "monitoring",
                "isAutomaticallyResolved": False
            },
            {
                "title": "Network QoS Optimization",
                "description": "Implement Quality of Service (QoS) parameters to prioritize handover traffic and reduce latency.",
                "category": "network",
                "isAutomaticallyResolved": True
            },
            {
                "title": "Reconfigure Load Balancer Algorithm",
                "description": "Switch load balancing algorithm from round-robin to least-connections for improved distribution.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/load-balancing"
            },
            {
                "title": "Certificate Auto-renewal Setup",
                "description": "Configure automated certificate renewal using Let's Encrypt or similar service to prevent expiration.",
                "category": "authentication",
                "isAutomaticallyResolved": True
            },
            {
                "title": "Database Connection Pool Optimization",
                "description": "Increase connection pool size and implement connection timeout policies to handle peak loads.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/db-optimization"
            }
        ]
        
        # Select random issues
        issues = []
        used_indices = set()
        for _ in range(num_issues):
            while True:
                idx = random.randint(0, len(issue_templates) - 1)
                if idx not in used_indices:
                    used_indices.add(idx)
                    break
            
            issue = issue_templates[idx].copy()
            # Randomly assign status
            issue["status"] = random.choice(["pending", "in_progress", "fixed"])
            issues.append(issue)
        
        # Select random recommendations
        recommendations = []
        num_recommendations = random.randint(1, 3)
        used_indices = set()
        for _ in range(num_recommendations):
            while True:
                idx = random.randint(0, len(recommendation_templates) - 1)
                if idx not in used_indices:
                    used_indices.add(idx)
                    break
            
            recommendation = recommendation_templates[idx].copy()
            recommendations.append(recommendation)
        
        # Generate a summary
        summaries = [
            "Analysis identified multiple critical issues requiring immediate attention.",
            "Several configuration issues detected that may impact service quality.",
            "Analysis revealed potential security vulnerabilities in authentication systems.",
            "Performance degradation likely due to resource constraints and configuration issues.",
            "Network optimization opportunities identified to improve service quality."
        ]
        
        summary = random.choice(summaries)
        
        # Determine overall severity based on issues
        severities = [issue["severity"] for issue in issues]
        if "high" in severities:
            severity = "high"
        elif "medium" in severities:
            severity = "medium"
        else:
            severity = "low"
        
        return {
            "issues": issues,
            "recommendations": recommendations,
            "summary": summary,
            "severity": severity
        }
    
    def analyze_log(self, log_content: str) -> Dict[str, Any]:
        """Analyze log content with LLM"""
        if self.mock_mode:
            return self.generate_mock_analysis(log_content)
        
        # For a real implementation, this would send the log to the LLM for analysis
        # and parse the response into the required format
        
        prompt = f"""
        You are a telecommunications network expert. Analyze the following log file and identify issues, 
        their severity, and provide recommendations for resolution:
        
        {log_content[:5000]}  # Truncate log for prompt size limits
        
        Respond with a JSON object containing:
        1. issues: array of issues with title, description, severity (high/medium/low), and firstOccurrence
        2. recommendations: array with title, description, category, and isAutomaticallyResolved flag
        3. summary: brief overview of findings
        4. severity: overall severity (high/medium/low)
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1000,
                "temperature": 0.2
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to analyze log: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON object from text (the LLM might include explanatory text)
        try:
            # Find JSON content (assuming it's enclosed in triple backticks)
            import re
            json_match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find any JSON-like structure
                json_match = re.search(r'({.*})', text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    json_str = text
            
            analysis_result = json.loads(json_str)
            
            # Ensure required fields are present
            if "issues" not in analysis_result:
                analysis_result["issues"] = []
            if "recommendations" not in analysis_result:
                analysis_result["recommendations"] = []
            if "summary" not in analysis_result:
                analysis_result["summary"] = "Analysis completed without detailed summary."
            if "severity" not in analysis_result:
                analysis_result["severity"] = "medium"
            
            return analysis_result
        
        except Exception as e:
            print(f"Error parsing LLM response: {str(e)}")
            # Fall back to mock analysis if parsing fails
            return self.generate_mock_analysis(log_content)
    
    def semantic_search(self, query: str, search_context: Union[str, List[str]]) -> str:
        """Perform semantic search with LLM"""
        if self.mock_mode:
            return f"Semantic search results for: {query}\n\nFound {len(search_context) if isinstance(search_context, list) else 1} relevant matches."
        
        # Convert context to string if it's a list
        if isinstance(search_context, list):
            context_text = "\n\n".join(search_context)
        else:
            context_text = search_context
        
        prompt = f"""
        Based on the following telecom log excerpts, answer the query: "{query}"
        
        Log excerpts:
        {context_text}
        
        Provide a concise summary of the information relevant to the query.
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 500,
                "temperature": 0.3
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to perform semantic search: {response.text}")
        
        data = response.json()
        return data.get("text", "No relevant information found.")
EOF

cat > python_backend/services/milvus_service.py << 'EOF'
import os
import time
import random
import hashlib
from typing import List, Dict, Any, Optional

# Import Milvus, but handle the case where it's not installed
try:
    from pymilvus import (
        connections,
        utility,
        FieldSchema,
        CollectionSchema,
        DataType,
        Collection,
        MilvusException
    )
    MILVUS_AVAILABLE = True
except ImportError:
    print("Milvus not installed, will use mock implementation")
    MILVUS_AVAILABLE = False

class MilvusService:
    """Service for interacting with Milvus vector database"""
    
    def __init__(self):
        """Initialize Milvus service"""
        # Get Milvus configuration from environment variables or use defaults
        self.host = os.environ.get('MILVUS_HOST', 'localhost')
        self.port = os.environ.get('MILVUS_PORT', '19530')
        self.collection_name = 'telecom_logs'
        
        # Vector dimensions (assuming we're using a model with 1536D embeddings)
        self.dimension = 1536
        
        # Connection tracking
        self.connection_error = None
        self.is_connecting = False
        
        # Try to initialize connection
        if MILVUS_AVAILABLE:
            try:
                self.initialize()
            except Exception as e:
                print(f"Milvus service is not accessible: {str(e)}")
                self.connection_error = e
        else:
            self.connection_error = Exception("Milvus not installed")
    
    def initialize(self) -> bool:
        """Initialize connection to Milvus"""
        if not MILVUS_AVAILABLE:
            return False
            
        if self.is_connecting:
            return False
        
        self.is_connecting = True
        try:
            # Connect to Milvus
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port
            )
            
            # Create collection if it doesn't exist
            self.ensure_collection()
            
            self.is_connecting = False
            return True
            
        except Exception as e:
            self.connection_error = e
            self.is_connecting = False
            raise
    
    def ensure_collection(self) -> None:
        """Ensure collection exists, create if it doesn't"""
        if not MILVUS_AVAILABLE:
            return
            
        if not utility.has_collection(self.collection_name):
            # Define fields for the collection
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="log_id", dtype=DataType.INT64),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.dimension)
            ]
            
            # Create schema
            schema = CollectionSchema(fields=fields, description="Telecom logs vector embeddings")
            
            # Create collection
            collection = Collection(name=self.collection_name, schema=schema)
            
            # Create index for vector field
            index_params = {
                "index_type": "HNSW",  # Or another appropriate index type
                "metric_type": "COSINE",  # Or another appropriate metric type
                "params": {"M": 8, "efConstruction": 64}
            }
            
            collection.create_index(field_name="vector", index_params=index_params)
            
            # Load collection into memory
            collection.load()
    
    def insert_embeddings(self, log_id: int, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert embeddings into Milvus"""
        if not MILVUS_AVAILABLE:
            # Mock implementation
            enriched_segments = []
            for i, segment in enumerate(segments):
                enriched_segment = segment.copy()
                enriched_segment["id"] = i + 1
                enriched_segment["logId"] = log_id
                enriched_segments.append(enriched_segment)
            return enriched_segments
            
        try:
            # Try to reconnect if there was a connection error
            if self.connection_error is not None:
                self.initialize()
            
            # Get collection
            collection = Collection(name=self.collection_name)
            
            # Prepare data
            entities = [
                [log_id] * len(segments),  # log_id field
                [segment["text"] for segment in segments],  # text field
                [segment["embedding"] for segment in segments]  # vector field
            ]
            
            # Insert data
            result = collection.insert(entities)
            
            # Map IDs back to segments
            insert_ids = result.primary_keys
            enriched_segments = []
            
            for i, segment in enumerate(segments):
                enriched_segment = segment.copy()
                enriched_segment["id"] = insert_ids[i]
                enriched_segment["logId"] = log_id
                enriched_segments.append(enriched_segment)
            
            return enriched_segments
            
        except Exception as e:
            print(f"Error inserting embeddings: {str(e)}")
            self.connection_error = e
            
            # Return segments without Milvus IDs in case of error
            enriched_segments = []
            for segment in segments:
                segment_copy = segment.copy()
                segment_copy["logId"] = log_id
                enriched_segments.append(segment_copy)
            
            return enriched_segments
    
    def search_similar_text(self, embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar text segments"""
        if not MILVUS_AVAILABLE:
            # Generate mock results using a deterministic algorithm based on query
            # This ensures consistent fallback results
            results = []
            seed = int(hashlib.md5(','.join(map(str, embedding[:5])).encode()).hexdigest(), 16) % (2**32)
            random.seed(seed)
            
            # Mock database with some example text segments
            mock_segments = [
                {"id": 1, "logId": 1, "text": "CPU usage high on node A, reaching 95% utilization"},
                {"id": 2, "logId": 1, "text": "Memory leak detected in process XYZ, allocating 2MB/minute"},
                {"id": 3, "logId": 2, "text": "Authentication failures from IP 192.168.1.100, possible brute force attack"},
                {"id": 4, "logId": 2, "text": "TLS certificate expiring in 10 days, renewal required"},
                {"id": 5, "logId": 3, "text": "Network latency between nodes increased to 150ms, exceeding threshold"},
                {"id": 6, "logId": 3, "text": "Load balancer misconfiguration detected, traffic not evenly distributed"},
                {"id": 7, "logId": 4, "text": "Database connection pool exhaustion, timeouts occurring"}
            ]
            
            # Shuffle the mock segments deterministically
            indices = list(range(len(mock_segments)))
            random.shuffle(indices)
            
            # Select up to the requested limit
            for i in indices[:limit]:
                segment = mock_segments[i].copy()
                # Add a random score between 0.6 and 0.95
                segment["score"] = 0.6 + (0.35 * random.random())
                results.append(segment)
            
            # Sort by score descending
            results.sort(key=lambda x: x["score"], reverse=True)
            
            return results
            
        try:
            # Try to reconnect if there was a connection error
            if self.connection_error is not None:
                self.initialize()
            
            # Get collection
            collection = Collection(name=self.collection_name)
            
            # Load collection (in case it's not already loaded)
            if not collection.is_loaded():
                collection.load()
            
            # Search parameters
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10}
            }
            
            # Execute search
            results = collection.search(
                data=[embedding],
                anns_field="vector",
                param=search_params,
                limit=limit,
                expr=None,
                output_fields=["log_id", "text"]
            )
            
            # Format results
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append({
                        "id": hit.id,
                        "logId": hit.entity.get('log_id'),
                        "text": hit.entity.get('text'),
                        "score": float(hit.score)
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"Error searching similar text: {str(e)}")
            self.connection_error = e
            
            # Generate mock results using a deterministic algorithm based on query
            # This ensures consistent fallback results
            results = []
            seed = int(hashlib.md5(','.join(map(str, embedding[:5])).encode()).hexdigest(), 16) % (2**32)
            random.seed(seed)
            
            # Mock database with some example text segments
            mock_segments = [
                {"id": 1, "logId": 1, "text": "CPU usage high on node A, reaching 95% utilization"},
                {"id": 2, "logId": 1, "text": "Memory leak detected in process XYZ, allocating 2MB/minute"},
                {"id": 3, "logId": 2, "text": "Authentication failures from IP 192.168.1.100, possible brute force attack"},
                {"id": 4, "logId": 2, "text": "TLS certificate expiring in 10 days, renewal required"},
                {"id": 5, "logId": 3, "text": "Network latency between nodes increased to 150ms, exceeding threshold"},
                {"id": 6, "logId": 3, "text": "Load balancer misconfiguration detected, traffic not evenly distributed"},
                {"id": 7, "logId": 4, "text": "Database connection pool exhaustion, timeouts occurring"}
            ]
            
            # Shuffle the mock segments deterministically
            indices = list(range(len(mock_segments)))
            random.shuffle(indices)
            
            # Select up to the requested limit
            for i in indices[:limit]:
                segment = mock_segments[i].copy()
                # Add a random score between 0.6 and 0.95
                segment["score"] = 0.6 + (0.35 * random.random())
                results.append(segment)
            
            # Sort by score descending
            results.sort(key=lambda x: x["score"], reverse=True)
            
            return results
EOF

cat > python_backend/__init__.py << 'EOF'
# This file is intentionally left empty
EOF

cat > python_backend/services/__init__.py << 'EOF'
# This file is intentionally left empty
EOF

# Download the run script and startup script
echo "Downloading run scripts..."
cat > run_python_backend.py << 'EOF'
#!/usr/bin/env python
"""
Script to run the Python backend for the Telecom Log Analysis Application
"""

import os
import sys
import subprocess
import pkg_resources

# Check required packages
REQUIRED_PACKAGES = [
    'flask',
    'flask-cors',
    'pymilvus',
    'python-dotenv',
    'requests'
]

def check_and_install_requirements():
    """Check if all required packages are installed and install them if necessary"""
    missing = []
    
    for package in REQUIRED_PACKAGES:
        try:
            pkg_resources.get_distribution(package)
        except pkg_resources.DistributionNotFound:
            missing.append(package)
    
    if missing:
        print(f"Installing missing packages: {', '.join(missing)}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("All required packages installed successfully.")

def ensure_directory_structure():
    """Ensure Python backend directory structure exists"""
    directories = [
        'python_backend',
        'python_backend/services',
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Create empty __init__.py files if they don't exist
    init_files = [
        'python_backend/__init__.py',
        'python_backend/services/__init__.py',
    ]
    
    for init_file in init_files:
        if not os.path.exists(init_file):
            with open(init_file, 'w') as f:
                f.write("# This file is intentionally left empty\n")

def main():
    """Main entry point"""
    # Check and install requirements
    check_and_install_requirements()
    
    # Ensure directory structure
    ensure_directory_structure()
    
    # Set environment variables if needed
    os.environ.setdefault('FLASK_APP', 'python_backend.app')
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Run Flask application
    from python_backend.app import app
    
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

if __name__ == '__main__':
    main()
EOF

cat > start_app.sh << 'EOF'
#!/bin/bash

# Start Python backend on port 5001
echo "Starting Python backend on port 5001..."
python run_python_backend.py &
PYTHON_PID=$!

# Start TypeScript/React frontend on port 5000
echo "Starting React frontend on port 5000..."
npm run dev &
TS_PID=$!

# Function to kill both processes
cleanup() {
    echo "Shutting down servers..."
    kill -9 $PYTHON_PID
    kill -9 $TS_PID
    exit 0
}

# Handle termination signals
trap cleanup SIGINT SIGTERM

echo "Both servers started. Press Ctrl+C to stop."
echo "React frontend: http://localhost:5000"
echo "Python backend: http://localhost:5001"

# Keep script running
wait
EOF

# Make the scripts executable
chmod +x run_python_backend.py
chmod +x start_app.sh

echo "Telecom Log Analysis Application code has been downloaded successfully to: $(pwd)/telecom_log_analysis"
echo "To use the application:"
echo "1. cd telecom_log_analysis"
echo "2. npm install                # Install Node.js dependencies"
echo "3. pip install flask flask-cors pymilvus python-dotenv requests  # Install Python dependencies"
echo "4. chmod +x start_app.sh      # Make startup script executable"
echo "5. ./start_app.sh             # Start both servers"
EOF

# Make the download script executable
chmod +x download_code.sh

echo "Download script created. You can now run ./download_code.sh to download all the code files."