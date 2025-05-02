import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  SearchIcon, 
  Loader2, 
  Target, 
  ArrowRight,
  ArrowRightCircle,
  AlertTriangle,
  Link2,
  Network,
  Eye,
  Waves
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "../config";

interface RootCauseNode {
  id: string;
  title: string;
  description: string;
  confidence: number;
  evidencePoints: string[];
  level: "root" | "contributing" | "symptom";
}

interface RootCauseLink {
  source: string;
  target: string;
  label?: string;
}

interface RootCauseAnalysisResult {
  nodes: RootCauseNode[];
  links: RootCauseLink[];
  summary: string;
  recommendations: string[];
}

export function RootCauseAnalysis({ logId }: { logId: number }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  const { data, isLoading, error } = useQuery<RootCauseAnalysisResult>({
    queryKey: [`/api/logs/${logId}/root-cause`],
    enabled: !!logId,
  });
  
  // Get the root cause nodes
  const getRootCauses = () => {
    if (!data?.nodes) return [];
    return data.nodes.filter(node => node.level === "root");
  };
  
  // Get contributing factors
  const getContributingFactors = () => {
    if (!data?.nodes) return [];
    return data.nodes.filter(node => node.level === "contributing");
  };
  
  // Get symptoms
  const getSymptoms = () => {
    if (!data?.nodes) return [];
    return data.nodes.filter(node => node.level === "symptom");
  };
  
  // Get node by ID
  const getNodeById = (id: string) => {
    if (!data?.nodes) return null;
    return data.nodes.find(node => node.id === id) || null;
  };
  
  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-lime-600";
    if (confidence >= 40) return "text-amber-600";
    if (confidence >= 20) return "text-orange-600";
    return "text-red-600";
  };
  
  // Get level badge
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'root':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Root Cause</Badge>;
      case 'contributing':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">Contributing Factor</Badge>;
      case 'symptom':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Symptom</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };
  
  // Get level icon
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'root':
        return <Target className="h-4 w-4 text-red-500" />;
      case 'contributing':
        return <Waves className="h-4 w-4 text-amber-500" />;
      case 'symptom':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <Eye className="h-4 w-4 text-slate-500" />;
    }
  };
  
  // Get relationships for a node
  const getNodeRelationships = (nodeId: string) => {
    if (!data?.links) return { sources: [], targets: [] };
    
    const sources = data.links
      .filter(link => link.target === nodeId)
      .map(link => {
        const sourceNode = getNodeById(link.source);
        return {
          nodeId: link.source,
          title: sourceNode?.title || "Unknown",
          level: sourceNode?.level || "unknown",
          label: link.label
        };
      });
      
    const targets = data.links
      .filter(link => link.source === nodeId)
      .map(link => {
        const targetNode = getNodeById(link.target);
        return {
          nodeId: link.target,
          title: targetNode?.title || "Unknown",
          level: targetNode?.level || "unknown",
          label: link.label
        };
      });
      
    return { sources, targets };
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2 text-primary" />
          Root Cause Analysis
        </CardTitle>
        <CardDescription>
          Identifying the underlying causes of issues in log data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Analyzing root causes...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error analyzing root causes</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-md">
              <p className="text-slate-700">{data.summary}</p>
            </div>
            
            {/* Graph visualization representation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Root Causes Column */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-red-500" />
                  <span>Root Causes</span>
                </h3>
                
                {getRootCauses().map(node => (
                  <div 
                    key={node.id}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      selectedNode === node.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <h4 className="font-medium text-slate-900 mb-1">{node.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getConfidenceColor(node.confidence)}>
                        {node.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {getRootCauses().length === 0 && (
                  <div className="text-center py-4 border rounded-md border-dashed border-slate-300 bg-slate-50">
                    <p className="text-slate-500 text-sm">No root causes identified</p>
                  </div>
                )}
              </div>
              
              {/* Contributing Factors Column */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                  <Waves className="h-4 w-4 text-amber-500" />
                  <span>Contributing Factors</span>
                </h3>
                
                {getContributingFactors().map(node => (
                  <div 
                    key={node.id}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      selectedNode === node.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <h4 className="font-medium text-slate-900 mb-1">{node.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getConfidenceColor(node.confidence)}>
                        {node.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {getContributingFactors().length === 0 && (
                  <div className="text-center py-4 border rounded-md border-dashed border-slate-300 bg-slate-50">
                    <p className="text-slate-500 text-sm">No contributing factors identified</p>
                  </div>
                )}
              </div>
              
              {/* Symptoms Column */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-blue-500" />
                  <span>Observable Symptoms</span>
                </h3>
                
                {getSymptoms().map(node => (
                  <div 
                    key={node.id}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      selectedNode === node.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <h4 className="font-medium text-slate-900 mb-1">{node.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getConfidenceColor(node.confidence)}>
                        {node.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {getSymptoms().length === 0 && (
                  <div className="text-center py-4 border rounded-md border-dashed border-slate-300 bg-slate-50">
                    <p className="text-slate-500 text-sm">No symptoms identified</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Node Details */}
            {selectedNode && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-slate-50 p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelIcon(getNodeById(selectedNode)?.level || "unknown")}
                        <h3 className="font-medium text-lg">{getNodeById(selectedNode)?.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {getLevelBadge(getNodeById(selectedNode)?.level || "unknown")}
                        <Badge variant="outline" className={getConfidenceColor(getNodeById(selectedNode)?.confidence || 0)}>
                          {getNodeById(selectedNode)?.confidence || 0}% confidence
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedNode(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-slate-700">{getNodeById(selectedNode)?.description}</p>
                  </div>
                  
                  {/* Evidence Points */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Evidence in Logs</h4>
                    <div className="space-y-2">
                      {getNodeById(selectedNode)?.evidencePoints.map((evidence, i) => (
                        <div key={i} className="bg-slate-50 p-2 rounded border text-sm">
                          {evidence}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Relationships */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Relationships</h4>
                    <div className="space-y-4">
                      {/* Causes (incoming) */}
                      {getNodeRelationships(selectedNode).sources.length > 0 && (
                        <div>
                          <h5 className="text-xs text-slate-500 mb-1">CAUSED BY</h5>
                          <div className="space-y-1">
                            {getNodeRelationships(selectedNode).sources.map((rel, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                className="w-full justify-between text-left font-normal h-auto py-2"
                                onClick={() => setSelectedNode(rel.nodeId)}
                              >
                                <div className="flex items-center gap-2">
                                  {getLevelIcon(rel.level)}
                                  <span>{rel.title}</span>
                                </div>
                                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Effects (outgoing) */}
                      {getNodeRelationships(selectedNode).targets.length > 0 && (
                        <div>
                          <h5 className="text-xs text-slate-500 mb-1">LEADS TO</h5>
                          <div className="space-y-1">
                            {getNodeRelationships(selectedNode).targets.map((rel, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                className="w-full justify-between text-left font-normal h-auto py-2"
                                onClick={() => setSelectedNode(rel.nodeId)}
                              >
                                <div className="flex items-center gap-2">
                                  {getLevelIcon(rel.level)}
                                  <span>{rel.title}</span>
                                </div>
                                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {getNodeRelationships(selectedNode).sources.length === 0 && 
                       getNodeRelationships(selectedNode).targets.length === 0 && (
                        <div className="text-center py-3 border rounded-md border-dashed">
                          <Network className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No relationships found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-3">Recommended Actions</h3>
                <div className="border rounded-md overflow-hidden">
                  <div className="divide-y">
                    {data.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 flex">
                        <div className="mr-3 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                            {index + 1}
                          </div>
                        </div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Target className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Select a log to view root cause analysis</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-slate-500">
        Root cause analysis identifies the underlying factors and their relationships in log issues
      </CardFooter>
    </Card>
  );
}