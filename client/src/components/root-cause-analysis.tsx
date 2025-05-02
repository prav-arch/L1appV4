import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, Network, Share2, GanttChart, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "../config";

interface RootCause {
  description: string;
  explanation: string;
  confidence: number;
  affectedComponents: string[];
  evidence: string[];
}

interface Relationship {
  from: string;
  to: string;
  relationship: string;
  strength: string;
}

interface RootCauseAnalysisResult {
  root_causes: RootCause[];
  relationships: Relationship[];
  summary: string;
}

export function RootCauseAnalysis({ logId }: { logId: number }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<RootCauseAnalysisResult>({
    queryKey: [`/api/logs/${logId}/root-cause-analysis`],
    enabled: false, // Don't fetch on mount
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
  };

  // Function to render confidence badge with appropriate color
  const renderConfidenceBadge = (confidence: number) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    
    if (confidence >= 0.8) {
      variant = "default";
    } else if (confidence >= 0.6) {
      variant = "secondary";
    } else {
      variant = "outline";
    }
    
    return (
      <Badge variant={variant}>
        {Math.round(confidence * 100)}% confidence
      </Badge>
    );
  };

  // Function to render relationship strength with appropriate color
  const getStrengthColor = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'strong':
        return 'text-green-600';
      case 'medium':
        return 'text-amber-600';
      case 'weak':
        return 'text-slate-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2 text-primary" />
          Root Cause Analysis
        </CardTitle>
        <CardDescription>
          Deep analysis to identify underlying causes of detected issues
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Performing deep root cause analysis...</p>
            <p className="text-xs text-slate-400 mt-1">This may take a minute to complete</p>
          </div>
        ) : data?.root_causes ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-md">
              <p className="text-slate-700">{data.summary}</p>
            </div>
            
            {/* Root causes */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 text-primary" />
                Identified Root Causes
              </h3>
              
              <div className="space-y-4">
                {data.root_causes.map((cause, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-slate-900">{cause.description}</h4>
                      {renderConfidenceBadge(cause.confidence)}
                    </div>
                    
                    <p className="mt-2 text-sm text-slate-700">{cause.explanation}</p>
                    
                    {/* Affected components */}
                    <div className="mt-3">
                      <h5 className="text-xs text-slate-500 uppercase mb-1">Affected Components</h5>
                      <div className="flex flex-wrap gap-1">
                        {cause.affectedComponents.map((component, i) => (
                          <Badge key={i} variant="outline">{component}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Evidence */}
                    <div className="mt-3">
                      <h5 className="text-xs text-slate-500 uppercase mb-1">Supporting Evidence</h5>
                      <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
                        {cause.evidence.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Relationships */}
            {data.relationships.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center">
                  <Share2 className="h-4 w-4 mr-1 text-primary" />
                  Causal Relationships
                </h3>
                
                <div className="border rounded-md p-4">
                  <ul className="space-y-2">
                    {data.relationships.map((rel, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <span className="font-medium">{rel.from}</span>
                        <ArrowUpRight className="h-4 w-4 mx-2 text-slate-400" />
                        <span className={`italic ${getStrengthColor(rel.strength)}`}>{rel.relationship}</span>
                        <ArrowUpRight className="h-4 w-4 mx-2 text-slate-400" />
                        <span className="font-medium">{rel.to}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{rel.strength}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error performing root cause analysis</p>
            <Button onClick={runAnalysis}>Try Again</Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <GanttChart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Run a deep analysis to identify root causes of detected issues</p>
            <Button onClick={runAnalysis}>Start Root Cause Analysis</Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between flex-col sm:flex-row gap-2">
        <p className="text-xs text-slate-500">
          Analyzes patterns across logs to identify underlying causes that connect multiple issues
        </p>
        {data?.root_causes && (
          <Button variant="outline" size="sm" onClick={runAnalysis}>
            Refresh Analysis
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}