import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ForceGraph2D from "react-force-graph-2d";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Network, BarChartHorizontal, Bug, AlertTriangle, CheckCircle2, HelpCircle, Shield } from "lucide-react";
import { API_BASE_URL } from "../config";

// Define types for the root cause analysis data
interface IssueNode {
  id: string;
  name: string;
  type: "issue" | "cause" | "effect" | "related";
  severity: "high" | "medium" | "low";
  status: "resolved" | "pending" | "investigating";
  description: string;
}

interface IssueLink {
  source: string;
  target: string;
  strength: number;
  type: "causes" | "affects" | "related" | "mitigates";
  description?: string;
}

interface RootCauseData {
  nodes: IssueNode[];
  links: IssueLink[];
  summary: string;
  recommendations: string[];
}

export function RootCauseAnalysis({ logId }: { logId: number }) {
  const [selectedIssue, setSelectedIssue] = useState<IssueNode | null>(null);
  const [graphDistance, setGraphDistance] = useState<number>(120);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const graphRef = useRef<any>(null);
  
  // Fetch root cause analysis data
  const { data, isLoading, isError, error } = useQuery<RootCauseData>({
    queryKey: [`${API_BASE_URL}/logs/${logId}/root-cause-analysis`],
    enabled: !!logId,
  });
  
  // Center the graph when data changes
  useEffect(() => {
    if (data && graphRef.current) {
      // Allow the graph to stabilize and then zoom to fit
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400);
        }
      }, 500);
    }
  }, [data]);
  
  // Filter nodes based on severity if needed
  const getFilteredData = () => {
    if (!data) return { nodes: [], links: [] };
    if (filterSeverity === "all") return data;
    
    const filteredNodes = data.nodes.filter(node => 
      filterSeverity === "all" || node.severity === filterSeverity
    );
    
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    const filteredLinks = data.links.filter(link => 
      nodeIds.has(link.source.toString()) && nodeIds.has(link.target.toString())
    );
    
    return { 
      ...data, 
      nodes: filteredNodes, 
      links: filteredLinks 
    };
  };
  
  // Node color based on type and severity
  const getNodeColor = (node: IssueNode) => {
    if (node.type === "cause") {
      return node.severity === "high" ? "#ef4444" : node.severity === "medium" ? "#f97316" : "#eab308";
    } else if (node.type === "issue") {
      return node.severity === "high" ? "#dc2626" : node.severity === "medium" ? "#ea580c" : "#ca8a04";
    } else if (node.type === "effect") {
      return node.severity === "high" ? "#b91c1c" : node.severity === "medium" ? "#c2410c" : "#a16207";
    }
    return "#6b7280"; // default for related
  };
  
  // Node size based on node type
  const getNodeSize = (node: IssueNode) => {
    if (node.type === "cause") return 12;
    if (node.type === "issue") return 14;
    if (node.type === "effect") return 10;
    return 8; // related
  };
  
  // Link color based on relationship type
  const getLinkColor = (link: IssueLink) => {
    if (link.type === "causes") return "#ef4444";
    if (link.type === "affects") return "#f97316";
    if (link.type === "mitigates") return "#22c55e";
    return "#94a3b8"; // related
  };
  
  // Format node label based on node type
  const getNodeLabel = (node: IssueNode) => {
    const maxLength = 25;
    const shortenedName = node.name.length > maxLength 
      ? node.name.substring(0, maxLength) + '...' 
      : node.name;
      
    return shortenedName;
  };
  
  // Handle node click to show details
  const handleNodeClick = (node: IssueNode) => {
    setSelectedIssue(node);
  };
  
  // Render the status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolved
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <HelpCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case "investigating":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <Bug className="w-3 h-3 mr-1" />
            Investigating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };
  
  // Render the severity badge
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Medium
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2 text-primary" />
          Root Cause Analysis
        </CardTitle>
        <CardDescription>
          Interactive visualization of issue relationships and root causes
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-primary mb-4" />
            <p className="text-slate-600">Analyzing logs to identify root causes...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-slate-800 font-medium mb-2">Failed to load root cause analysis</p>
            <p className="text-slate-600 text-sm">
              {error instanceof Error ? error.message : "An unknown error occurred"}
            </p>
            <Button variant="outline" className="mt-4">Retry</Button>
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChartHorizontal className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-800 font-medium mb-2">No root cause data available</p>
            <p className="text-slate-600 text-sm">
              There isn't enough data to perform a root cause analysis for this log file.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Severity Filter</label>
                <Select
                  value={filterSeverity}
                  onValueChange={setFilterSeverity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Node Distance</label>
                <div className="pt-2">
                  <Slider 
                    value={[graphDistance]}
                    min={50}
                    max={300}
                    step={10}
                    onValueChange={(value) => setGraphDistance(value[0])}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (graphRef.current) {
                      graphRef.current.zoomToFit(400);
                    }
                  }}
                  className="mt-5"
                >
                  Center Graph
                </Button>
              </div>
            </div>
            
            {/* Graph */}
            <div className="h-[400px] border rounded-lg bg-slate-50 overflow-hidden">
              <ForceGraph2D
                ref={graphRef}
                graphData={getFilteredData() as any}
                nodeLabel={(node: any) => getNodeLabel(node as IssueNode)}
                nodeColor={(node: any) => getNodeColor(node as IssueNode)}
                nodeRelSize={6} // Base size, will be modified by the node type
                linkColor={(link: any) => getLinkColor(link as IssueLink)}
                linkWidth={(link: any) => (link as IssueLink).strength}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={0.7}
                linkCurvature={0.25}
                onNodeClick={(node: any) => handleNodeClick(node as IssueNode)}
                cooldownTicks={100}
                nodeCanvasObjectMode={() => "after"}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const typedNode = node as IssueNode & { x: number, y: number };
                  const label = getNodeLabel(typedNode);
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                  
                  // Draw background for text
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5);
                  
                  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                  ctx.fillRect(
                    typedNode.x - bckgDimensions[0] / 2,
                    typedNode.y - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1]
                  );
                  
                  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                  ctx.fillText(label, typedNode.x, typedNode.y);

                  // Draw a circle with size based on node type
                  const size = getNodeSize(typedNode);
                  ctx.beginPath();
                  ctx.arc(typedNode.x, typedNode.y, size/2, 0, 2 * Math.PI, false);
                  ctx.fillStyle = getNodeColor(typedNode);
                  ctx.fill();
                }}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                warmupTicks={100}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.01}
                dagMode={'none' as any}
                dagLevelDistance={graphDistance}
              />
            </div>
            
            {/* Details panel for selected issue */}
            {selectedIssue && (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium text-slate-900">{selectedIssue.name}</h3>
                  <div className="flex space-x-2">
                    {renderSeverityBadge(selectedIssue.severity)}
                    {renderStatusBadge(selectedIssue.status)}
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-3">{selectedIssue.description}</p>
                
                <div className="flex justify-between border-t pt-3">
                  <div className="text-xs text-slate-500">
                    Type: <span className="font-medium capitalize">{selectedIssue.type}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIssue(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {/* Summary and recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-slate-900 mb-2">Analysis Summary</h3>
                <p className="text-sm text-slate-600">{data.summary}</p>
              </div>
              
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-slate-900 mb-2">Recommendations</h3>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-slate-600 flex">
                      <span className="text-primary mr-2">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}