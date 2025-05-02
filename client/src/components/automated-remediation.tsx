import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Wrench, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Terminal, 
  AlertTriangle,
  RotateCcw,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "../config";

interface RemediationStep {
  description: string;
  commands: string[] | null;
  expected_outcome: string;
}

interface RemediationResult {
  steps: RemediationStep[];
  verification: string;
  rollback: string;
  estimated_time: string;
  risk_level: "low" | "medium" | "high";
}

export function AutomatedRemediation({ issueId }: { issueId: number }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const { data, isLoading, error, refetch } = useQuery<RemediationResult>({
    queryKey: [`/api/issues/${issueId}/remediation`],
    enabled: false, // Don't fetch on mount
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  const markStepComplete = (index: number) => {
    if (!completedSteps.includes(index)) {
      setCompletedSteps(prev => [...prev, index]);
      
      // Advance to next step if this was the current step
      if (index === currentStep && data && currentStep < data.steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const resetSteps = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  // Get risk level badge
  const getRiskBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High risk</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium risk</Badge>;
      case 'low':
        return <Badge variant="outline">Low risk</Badge>;
      default:
        return <Badge variant="outline">{risk}</Badge>;
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    if (!data || data.steps.length === 0) return 0;
    return Math.round((completedSteps.length / data.steps.length) * 100);
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-primary" />
          Automated Remediation
        </CardTitle>
        <CardDescription>
          Step-by-step guidance to resolve the detected issue
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Generating remediation plan...</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Progress and metadata */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Est. time: {data.estimated_time}</span>
                </div>
                {getRiskBadge(data.risk_level)}
              </div>
              
              <Progress value={getCompletionPercentage()} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {completedSteps.length} of {data.steps.length} steps completed
                </span>
                <span className="text-xs font-medium">{getCompletionPercentage()}%</span>
              </div>
            </div>
            
            {/* Steps */}
            <div className="space-y-4">
              {data.steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`border rounded-md ${
                    index === currentStep 
                      ? "border-primary bg-primary/5" 
                      : completedSteps.includes(index)
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200"
                  } transition-colors`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {completedSteps.includes(index) ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : index === currentStep ? (
                          <AlertCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-slate-600">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{step.description}</h4>
                        <p className="text-sm text-slate-600 mt-1">{step.expected_outcome}</p>
                        
                        {step.commands && step.commands.length > 0 && (
                          <div className="mt-3 bg-slate-800 rounded-md p-3 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-medium text-slate-400">COMMANDS</span>
                            </div>
                            {step.commands.map((cmd, cmdIndex) => (
                              <div key={cmdIndex} className="font-mono text-xs text-slate-200 mb-1 last:mb-0">
                                $ {cmd}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index === currentStep && (
                    <div className="flex border-t">
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none text-sm h-10 border-r" 
                        onClick={() => markStepComplete(index)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Mark Complete
                      </Button>
                      
                      {index < data.steps.length - 1 && (
                        <Button 
                          variant="ghost" 
                          className="flex-1 rounded-none text-sm h-10" 
                          onClick={() => setCurrentStep(index + 1)}
                        >
                          Skip
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Verification */}
            <div className="border border-blue-200 bg-blue-50 rounded-md p-4">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verification Steps
              </h4>
              <p className="mt-1 text-sm text-blue-700">{data.verification}</p>
            </div>
            
            {/* Rollback */}
            <div className="border border-amber-200 bg-amber-50 rounded-md p-4">
              <h4 className="font-medium text-amber-800 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Rollback Plan
              </h4>
              <p className="mt-1 text-sm text-amber-700">{data.rollback}</p>
            </div>
            
            {/* Completion actions */}
            {completedSteps.length === data.steps.length && (
              <div className="border border-green-200 bg-green-50 rounded-md p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium text-green-800">Remediation Complete</h4>
                <p className="text-sm text-green-700 mt-1">All steps have been completed. Verify the issue has been resolved.</p>
                <Button 
                  variant="outline" 
                  className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={resetSteps}
                >
                  Reset Steps
                </Button>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error generating remediation plan</p>
            <Button onClick={runAnalysis}>Try Again</Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Generate a step-by-step plan to resolve this issue</p>
            <Button onClick={runAnalysis}>Generate Remediation Plan</Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between flex-col sm:flex-row gap-2">
        <p className="text-xs text-slate-500">
          AI-generated troubleshooting steps with commands, verification, and rollback procedures
        </p>
        {data && (
          <Button variant="outline" size="sm" onClick={runAnalysis}>
            Regenerate Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}