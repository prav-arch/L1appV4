import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  FileText,
  Lightbulb,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { API_BASE_URL } from "../config";

interface ResolutionStep {
  description: string;
  commands?: string[];
  expected_outcome?: string;
}

interface ResolutionFeedbackProps {
  issueId: number;
  issueTitle: string;
  steps: ResolutionStep[];
  onFeedbackSubmitted?: () => void;
}

export function ResolutionFeedback({ 
  issueId, 
  issueTitle, 
  steps, 
  onFeedbackSubmitted 
}: ResolutionFeedbackProps) {
  const [wasSuccessful, setWasSuccessful] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const submitFeedback = useMutation({
    mutationFn: async (data: { 
      wasSuccessful: boolean; 
      feedback: string; 
      steps: ResolutionStep[] 
    }) => {
      const response = await fetch(`${API_BASE_URL}/issues/${issueId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping improve our recommendation system",
        variant: "default",
      });
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    },
    onError: (error) => {
      toast({
        title: "Error submitting feedback",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (wasSuccessful === null) {
      toast({
        title: "Please select an option",
        description: "Did this resolution work for you?",
        variant: "destructive",
      });
      return;
    }
    
    submitFeedback.mutate({
      wasSuccessful,
      feedback,
      steps,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-primary" />
          Resolution Feedback
        </CardTitle>
        <CardDescription>
          Help improve our recommendation system by providing feedback
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <FileText className="h-4 w-4 text-slate-400 mr-2" />
            <h4 className="font-medium text-sm">Issue: {issueTitle}</h4>
          </div>
          
          {steps.length > 0 && (
            <div className="text-sm text-slate-600">
              <p className="mb-1">Applied {steps.length} remediation steps</p>
            </div>
          )}
        </div>
        
        <div>
          <Label className="text-base">Did the recommended steps resolve the issue?</Label>
          <div className="flex gap-4 mt-2">
            <Button
              type="button"
              variant={wasSuccessful === true ? "default" : "outline"}
              className="flex-1"
              onClick={() => setWasSuccessful(true)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Yes, it worked
            </Button>
            
            <Button
              type="button"
              variant={wasSuccessful === false ? "default" : "outline"}
              className="flex-1"
              onClick={() => setWasSuccessful(false)}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              No, problem persists
            </Button>
          </div>
        </div>
        
        <div>
          <Label htmlFor="feedback">Additional comments (optional)</Label>
          <Textarea
            id="feedback"
            placeholder="Share what worked well or what could be improved..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        {wasSuccessful === false && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start">
              <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5 mr-2" />
              <div>
                <p className="text-sm text-amber-800">
                  We're sorry the recommendations didn't resolve your issue. Your feedback helps us improve future recommendations.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={wasSuccessful === null || submitFeedback.isPending}
        >
          {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}