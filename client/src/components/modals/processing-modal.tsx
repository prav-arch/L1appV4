import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface ProcessingStep {
  name: string;
  status: 'waiting' | 'in_progress' | 'complete' | 'error';
  progress: number;
}

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: ProcessingStep[];
  canCancel?: boolean;
  showViewResults?: boolean;
}

export function ProcessingModal({
  isOpen,
  onClose,
  steps,
  canCancel = true,
  showViewResults = false
}: ProcessingModalProps) {
  const getStatusText = (status: ProcessingStep['status']): string => {
    switch (status) {
      case 'waiting':
        return 'Waiting...';
      case 'in_progress':
        return `${Math.floor(steps.find(s => s.status === 'in_progress')?.progress || 0)}%`;
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };
  
  const getStatusColor = (status: ProcessingStep['status']): string => {
    switch (status) {
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'in_progress':
        return 'text-slate-600';
      default:
        return 'text-slate-500';
    }
  };
  
  const getProgressBarColor = (status: ProcessingStep['status']): string => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-primary';
      default:
        return 'bg-slate-400';
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Processing Logs</DialogTitle>
        </DialogHeader>
        <div className="p-1">
          {steps.map((step, index) => (
            <div key={index} className="mb-5">
              <div className="flex items-center mb-1">
                <p className="flex-grow font-medium text-slate-700">{step.name}</p>
                <span className={`text-sm ${getStatusColor(step.status)}`}>
                  {getStatusText(step.status)}
                </span>
              </div>
              <Progress 
                value={step.progress} 
                className={`h-2 ${step.status === 'waiting' ? 'bg-slate-200' : ''}`}
                indicatorClassName={getProgressBarColor(step.status)}
              />
            </div>
          ))}
          
          <div className="text-center text-sm text-slate-500 mt-4">
            <p>This may take a few minutes depending on file size and complexity</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {canCancel && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            disabled={!showViewResults} 
            onClick={onClose}
          >
            View Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
