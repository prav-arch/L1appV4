import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Cpu, 
  Database, 
  FileText, 
  Code, 
  Zap, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  BarChart, 
  BookOpen, 
  Radar, 
  Upload, 
  Braces
} from 'lucide-react';

// Type definitions
interface FineTuningJob {
  id: string;
  dataset_id: string;
  model_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  output_model_name: string;
  metrics: Record<string, any>;
  config: Record<string, any>;
  progress?: {
    current_epoch: number;
    total_epochs: number;
    current_step: number;
    total_steps: number;
    percentage_complete: number;
    estimated_time_remaining: string;
    loss: number | null;
    example_count: number;
    last_updated: string;
  };
  logs?: Array<{
    timestamp: string;
    message: string;
  }>;
}

interface FineTunedModel {
  id: string;
  base_model: string;
  fine_tuned_from_dataset: string;
  created_at: string;
  job_id: string;
}

interface Dataset {
  id: string;
  name: string;
  file_path: string;
  num_examples: number;
  created_at: string;
  status: string;
}

interface Log {
  id: number;
  filename: string;
  fileSize: number;
  processingStatus: string;
  uploadedAt: string;
}

export default function ModelFineTuning() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [createDatasetOpen, setCreateDatasetOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<FineTuningJob | null>(null);

  // Fetch fine-tuning jobs
  const { 
    data: jobsData, 
    isLoading: isLoadingJobs, 
    isError: isJobsError 
  } = useQuery<{ status: string; jobs: FineTuningJob[] }>({
    queryKey: ['/api/fine-tuning/jobs'],
    refetchInterval: 10000, // Refresh every 10 seconds for job status updates
  });

  // Fetch fine-tuned models
  const { 
    data: modelsData, 
    isLoading: isLoadingModels, 
    isError: isModelsError 
  } = useQuery<{ status: string; models: FineTunedModel[] }>({
    queryKey: ['/api/fine-tuning/models'],
  });

  // Fetch logs for dataset creation
  const { 
    data: logsData, 
    isLoading: isLoadingLogs 
  } = useQuery<Log[]>({
    queryKey: ['/api/logs'],
  });

  // Start fine-tuning job mutation
  const startJobMutation = useMutation({
    mutationFn: (data: { dataset_id: string; model_name: string; config?: Record<string, any> }) => 
      apiRequest('/api/fine-tuning/jobs', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fine-tuning job started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fine-tuning/jobs'] });
      setCreateJobOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to start fine-tuning job: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Create dataset mutation
  const createDatasetMutation = useMutation({
    mutationFn: (data: { log_ids: number[]; dataset_name: string }) => 
      apiRequest('/api/fine-tuning/datasets', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.dataset_info?.name 
          ? `Dataset created: ${data.dataset_info.name}`
          : "Dataset created successfully",
      });
      setCreateDatasetOpen(false);
      setSelectedLogIds([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create dataset: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Simulate job completion (for development)
  const simulateJobMutation = useMutation({
    mutationFn: (data: { job_id: string; success: boolean }) => 
      apiRequest(`/api/fine-tuning/jobs/${data.job_id}/simulate`, { 
        method: 'POST', 
        body: JSON.stringify({ success: data.success }) 
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job simulation completed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fine-tuning/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fine-tuning/models'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Simulation failed: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Form for dataset creation
  const { register: registerDataset, handleSubmit: handleSubmitDataset, formState: { errors: datasetErrors } } = useForm<{
    dataset_name: string;
  }>();

  // Form for job creation
  const { register: registerJob, handleSubmit: handleSubmitJob, formState: { errors: jobErrors } } = useForm<{
    model_name: string;
  }>();

  const onCreateDataset = (data: { dataset_name: string }) => {
    if (selectedLogIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one log",
        variant: "destructive",
      });
      return;
    }

    createDatasetMutation.mutate({
      log_ids: selectedLogIds,
      dataset_name: data.dataset_name
    });
  };

  const onCreateJob = (data: { model_name: string }) => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a dataset",
        variant: "destructive",
      });
      return;
    }

    startJobMutation.mutate({
      dataset_id: selectedJobId,
      model_name: data.model_name
    });
  };

  const toggleLogSelection = (logId: number) => {
    setSelectedLogIds(prev => 
      prev.includes(logId)
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  // Get job status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Running</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Render progress component
  const renderProgress = (job: FineTuningJob) => {
    // If no progress or not running, show a simple indicator
    if (!job.progress || job.status !== 'running') {
      return (
        <div className="text-sm text-slate-500">
          {job.status === 'completed' ? 'Completed' : 
           job.status === 'failed' ? 'Failed' : 
           job.status === 'pending' ? 'Pending' : 'N/A'}
        </div>
      );
    }
    
    // Show detailed progress for running jobs
    return (
      <div className="space-y-1 w-full max-w-[200px]">
        <div className="flex justify-between text-xs mb-1">
          <span>{job.progress.percentage_complete}% complete</span>
          <span>{job.progress.current_epoch}/{job.progress.total_epochs} epochs</span>
        </div>
        <Progress value={job.progress.percentage_complete} className="h-2" />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Loss: {job.progress.loss?.toFixed(4) || 'N/A'}</span>
          <span>ETA: {job.progress.estimated_time_remaining}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Model Fine-Tuning</h1>
          <p className="text-muted-foreground mt-1">
            Improve model performance with telecom-specific training
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={createDatasetOpen} onOpenChange={setCreateDatasetOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Create Dataset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Create Fine-Tuning Dataset</DialogTitle>
                <DialogDescription>
                  Select logs to create a training dataset for fine-tuning the model
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label htmlFor="dataset_name" className="mb-2 block">Dataset Name</Label>
                <Input 
                  id="dataset_name" 
                  placeholder="Telecom Errors Dataset"
                  {...registerDataset('dataset_name', { required: true })}
                  className="mb-4"
                />
                {datasetErrors.dataset_name && (
                  <p className="text-sm text-red-500 mt-1">Dataset name is required</p>
                )}
                
                <div className="border rounded-md mt-4 max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Log Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLogs ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            <Spinner size="sm" className="mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : logsData && logsData.length > 0 ? (
                        logsData.map(log => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedLogIds.includes(log.id)}
                                onCheckedChange={() => toggleLogSelection(log.id)}
                                id={`log-${log.id}`}
                              />
                            </TableCell>
                            <TableCell>{log.filename}</TableCell>
                            <TableCell>{log.processingStatus}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            No logs available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4 text-sm text-muted-foreground">
                  {selectedLogIds.length} logs selected
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDatasetOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitDataset(onCreateDataset)}
                  disabled={createDatasetMutation.isPending}
                >
                  {createDatasetMutation.isPending && <Spinner size="sm" className="mr-2" />}
                  Create Dataset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
            <DialogTrigger asChild>
              <Button>
                <Zap className="mr-2 h-4 w-4" />
                Start Fine-Tuning
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Start Fine-Tuning Job</DialogTitle>
                <DialogDescription>
                  Fine-tune a model on telecom-specific data
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label htmlFor="dataset_select" className="mb-2 block">Select Dataset</Label>
                <div className="border rounded-md max-h-[200px] overflow-y-auto mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Dataset Name</TableHead>
                        <TableHead>Examples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsData?.jobs?.filter(job => job.status === 'completed').map(job => (
                        <TableRow key={job.dataset_id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedJobId === job.dataset_id}
                              onCheckedChange={() => setSelectedJobId(job.dataset_id)}
                              id={`dataset-${job.dataset_id}`}
                            />
                          </TableCell>
                          <TableCell>{job.dataset_id}</TableCell>
                          <TableCell>Unknown</TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            No datasets available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <Label htmlFor="model_name" className="mb-2 block">Base Model</Label>
                <Input 
                  id="model_name" 
                  placeholder="llama-3.1-8b-local"
                  {...registerJob('model_name', { required: true })}
                  className="mb-4"
                />
                {jobErrors.model_name && (
                  <p className="text-sm text-red-500 mt-1">Model name is required</p>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateJobOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitJob(onCreateJob)}
                  disabled={startJobMutation.isPending}
                >
                  {startJobMutation.isPending && <Spinner size="sm" className="mr-2" />}
                  Start Fine-Tuning
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="jobs">
            <Clock className="mr-2 h-4 w-4" />
            Fine-Tuning Jobs
          </TabsTrigger>
          <TabsTrigger value="models">
            <Cpu className="mr-2 h-4 w-4" />
            Fine-Tuned Models
          </TabsTrigger>
          <TabsTrigger value="guide">
            <BookOpen className="mr-2 h-4 w-4" />
            Fine-Tuning Guide
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="jobs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fine-Tuning Jobs</CardTitle>
                <CardDescription>
                  Monitor and manage your model fine-tuning jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                ) : isJobsError ? (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load fine-tuning jobs. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Dataset</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobsData?.jobs && jobsData.jobs.length > 0 ? (
                          jobsData.jobs.map(job => (
                            <TableRow key={job.id}>
                              <TableCell className="font-mono text-xs">{job.id}</TableCell>
                              <TableCell>{job.dataset_id}</TableCell>
                              <TableCell>{getStatusBadge(job.status)}</TableCell>
                              <TableCell>{renderProgress(job)}</TableCell>
                              <TableCell>{formatDate(job.created_at)}</TableCell>
                              <TableCell>{formatDate(job.completed_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {job.status === 'running' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => simulateJobMutation.mutate({ job_id: job.id, success: true })}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Simulate Success
                                    </Button>
                                  )}
                                  {job.status === 'running' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => simulateJobMutation.mutate({ job_id: job.id, success: false })}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Simulate Failure
                                    </Button>
                                  )}
                                  {(job.status === 'completed' || job.status === 'running') && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedJobDetails(job);
                                        setJobDetailsOpen(true);
                                      }}
                                    >
                                      <BarChart className="h-4 w-4 mr-1" />
                                      {job.status === 'completed' ? 'View Metrics' : 'View Details'}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6">
                              No fine-tuning jobs found. Start a new job to improve the model.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="models">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fine-Tuned Models</CardTitle>
                <CardDescription>
                  Models specialized for telecom log analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingModels ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                ) : isModelsError ? (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load fine-tuned models. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model ID</TableHead>
                          <TableHead>Base Model</TableHead>
                          <TableHead>Dataset</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modelsData?.models && modelsData.models.length > 0 ? (
                          modelsData.models.map(model => (
                            <TableRow key={model.id}>
                              <TableCell className="font-mono text-xs">{model.id}</TableCell>
                              <TableCell>{model.base_model}</TableCell>
                              <TableCell>{model.fine_tuned_from_dataset}</TableCell>
                              <TableCell>{formatDate(model.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm">
                                    <Radar className="h-4 w-4 mr-1" />
                                    Compare
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Code className="h-4 w-4 mr-1" />
                                    Use Model
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6">
                              No fine-tuned models available. Complete a fine-tuning job to create a specialized model.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="guide">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fine-Tuning Guide</CardTitle>
                <CardDescription>
                  Learn how to fine-tune the LLM for telecom log analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Why Fine-Tune Your LLM?</h3>
                    <p className="text-blue-700">
                      Fine-tuning helps the model understand telecom-specific terminology, protocols, and failure patterns, 
                      resulting in more accurate analysis and recommendations.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="bg-slate-100 rounded-full p-2 mt-1">
                        <FileText className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Step 1: Create a Dataset</h3>
                        <p className="text-slate-600">
                          Select logs with their analysis results to create a training dataset. 
                          Good datasets contain diverse examples of problems and their solutions.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-slate-100 rounded-full p-2 mt-1">
                        <Zap className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Step 2: Start a Fine-Tuning Job</h3>
                        <p className="text-slate-600">
                          Choose a base model and configuration. The job will train the model on your dataset to 
                          adapt it to telecom log analysis. This process may take time depending on dataset size.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-slate-100 rounded-full p-2 mt-1">
                        <Cpu className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Step 3: Use the Fine-Tuned Model</h3>
                        <p className="text-slate-600">
                          Once a job completes successfully, the fine-tuned model becomes available for analysis.
                          You can compare its performance against the base model to see the improvements.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-semibold mb-3">Best Practices</h3>
                    <ul className="list-disc pl-5 space-y-2 text-slate-700">
                      <li>Include diverse telecom log examples in your training data</li>
                      <li>Balance different issue types and severities</li>
                      <li>Include both simple and complex diagnosis cases</li>
                      <li>Consider periodically retraining as new types of issues emerge</li>
                      <li>Compare model versions to ensure improvements</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Job Details Drawer */}
      <Sheet open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedJobDetails?.status === 'completed' ? 
                'Fine-Tuning Results' : 
                'Fine-Tuning Progress'}
            </SheetTitle>
            <SheetDescription>
              {selectedJobDetails?.status === 'completed' ? 
                'Training metrics and final model details' : 
                'Real-time training progress and logs'}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="mt-6 h-[calc(100vh-180px)]">
            {selectedJobDetails && (
              <div className="space-y-6">
                {/* Job Info */}
                <div className="p-4 rounded-md border bg-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-slate-700">Job ID</div>
                      <div className="font-mono mt-1">{selectedJobDetails.id}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">Status</div>
                      <div className="mt-1">{getStatusBadge(selectedJobDetails.status)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">Dataset</div>
                      <div className="mt-1">{selectedJobDetails.dataset_id}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">Base Model</div>
                      <div className="mt-1">{selectedJobDetails.model_name}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">Started</div>
                      <div className="mt-1">{formatDate(selectedJobDetails.started_at)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">Completed</div>
                      <div className="mt-1">{formatDate(selectedJobDetails.completed_at)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Progress Section */}
                {selectedJobDetails.progress && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Training Progress</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Progress</span>
                        <span>{selectedJobDetails.progress.percentage_complete}%</span>
                      </div>
                      <Progress value={selectedJobDetails.progress.percentage_complete} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <div className="text-slate-600">Epoch</div>
                          <div className="font-medium mt-1">
                            {selectedJobDetails.progress.current_epoch} / {selectedJobDetails.progress.total_epochs}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600">Step</div>
                          <div className="font-medium mt-1">
                            {selectedJobDetails.progress.current_step} / {selectedJobDetails.progress.total_steps}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600">Loss</div>
                          <div className="font-medium mt-1">
                            {selectedJobDetails.progress.loss?.toFixed(4) || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600">ETA</div>
                          <div className="font-medium mt-1">
                            {selectedJobDetails.progress.estimated_time_remaining}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Metrics Section (for completed jobs) */}
                {selectedJobDetails.status === 'completed' && Object.keys(selectedJobDetails.metrics).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Training Metrics</h3>
                    
                    <div className="p-4 rounded-md border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(selectedJobDetails.metrics).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-slate-600">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            <div className="font-medium mt-1">
                              {typeof value === 'number' ? 
                                (key.includes('loss') ? value.toFixed(4) : value.toFixed(2)) : 
                                String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Training Logs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Training Logs</h3>
                  
                  <div className="border rounded-md p-4 bg-slate-50 font-mono text-sm overflow-x-auto">
                    {selectedJobDetails.logs && selectedJobDetails.logs.length > 0 ? (
                      <div className="space-y-2">
                        {selectedJobDetails.logs.map((log, idx) => (
                          <div key={idx} className="grid grid-cols-[80px_1fr] gap-2">
                            <div className="text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                            <div>{log.message}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">No logs available</div>
                    )}
                  </div>
                </div>
                
                {/* Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configuration</h3>
                  
                  <div className="p-4 rounded-md border bg-slate-50 overflow-x-auto">
                    <div className="font-mono text-sm">
                      <pre>{JSON.stringify(selectedJobDetails.config, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}