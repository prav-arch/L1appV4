import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertTriangle, 
  Lightbulb, 
  Loader2, 
  Sparkles, 
  Clock, 
  BrainCircuit,
  AlertOctagon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_BASE_URL } from "../config";

interface PredictiveIssue {
  title: string;
  description: string;
  likelihood: "high" | "medium" | "low";
  timeframe: string;
  preventiveActions: string[];
  indicators: string[];
}

interface PredictionResult {
  predictions: PredictiveIssue[];
  summary: string;
}

export function PredictiveAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<PredictionResult>({
    queryKey: [`/api/prediction/potential-issues`],
    enabled: false, // Don't fetch on mount
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
  };

  // Get likelihood badge
  const getLikelihoodBadge = (likelihood: string) => {
    switch (likelihood.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High likelihood</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium likelihood</Badge>;
      case 'low':
        return <Badge variant="outline">Low likelihood</Badge>;
      default:
        return <Badge variant="outline">{likelihood}</Badge>;
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BrainCircuit className="h-5 w-5 mr-2 text-primary" />
          Predictive Analysis
        </CardTitle>
        <CardDescription>
          AI predictions of potential issues before they occur
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Analyzing patterns and predicting potential issues...</p>
          </div>
        ) : data?.predictions && data.predictions.length > 0 ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-md">
              <p className="text-slate-700">{data.summary}</p>
            </div>
            
            {/* Predictions */}
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-0">
                <div className="border rounded-md divide-y">
                  {data.predictions.map((prediction, index) => (
                    <div key={index} className="p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <AlertOctagon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-slate-900">{prediction.title}</h4>
                            <p className="text-sm text-slate-700 mt-0.5">{prediction.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-500">{prediction.timeframe}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          {getLikelihoodBadge(prediction.likelihood)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="detailed" className="space-y-4">
                {data.predictions.map((prediction, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-slate-900">{prediction.title}</h4>
                      {getLikelihoodBadge(prediction.likelihood)}
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-4">{prediction.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {/* Timeframe */}
                      <div className="flex gap-2 items-start">
                        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-xs text-slate-700">EXPECTED TIMEFRAME</h5>
                          <p className="mt-1">{prediction.timeframe}</p>
                        </div>
                      </div>
                      
                      {/* Preventive Actions */}
                      <div className="flex gap-2 items-start">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-xs text-slate-700">PREVENTIVE ACTIONS</h5>
                          <ul className="mt-1 list-disc ml-4 space-y-1">
                            {prediction.preventiveActions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {/* Early Warning Signs */}
                      <div className="flex gap-2 items-start md:col-span-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-xs text-slate-700">EARLY WARNING INDICATORS</h5>
                          <ul className="mt-1 list-disc ml-4 space-y-1">
                            {prediction.indicators.map((indicator, i) => (
                              <li key={i}>{indicator}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error generating predictions</p>
            <Button onClick={runAnalysis}>Try Again</Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Lightbulb className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Generate predictions of potential future issues based on log patterns</p>
            <Button onClick={runAnalysis}>Analyze Potential Issues</Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between flex-col sm:flex-row gap-2">
        <p className="text-xs text-slate-500">
          Uses pattern recognition and trend analysis to predict issues before they occur
        </p>
        {data?.predictions && (
          <Button variant="outline" size="sm" onClick={runAnalysis}>
            Refresh Predictions
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}