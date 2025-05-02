import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadLog } from "@/lib/api";
import { ProcessingModal } from "@/components/modals/processing-modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";

export default function UploadLogs() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const uploadMutation = useMutation({
    mutationFn: uploadLog,
    onSuccess: (data) => {
      setShowProcessingModal(true);
      setUploadSuccess(true);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      // Mock the processing steps - in a real app this would be updated via WebSockets
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/logs', data.id] });
      }, 5000);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    }
  });
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadSuccess(false);
  };
  
  const handleFileClear = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
  };
  
  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    uploadMutation.mutate(selectedFile);
  };
  
  const closeProcessingModal = () => {
    setShowProcessingModal(false);
    setSelectedFile(null);
  };
  
  const viewResults = () => {
    navigate("/logs");
  };
  
  return (
    <MainLayout title="Upload Logs">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Telecom Logs</CardTitle>
          <CardDescription>
            Upload your telecom log files for AI-powered analysis and troubleshooting recommendations.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {uploadSuccess ? (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Your log file is now being processed. This may take a few minutes depending on the file size.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Supported Formats</AlertTitle>
              <AlertDescription>
                Upload telecom log files in .log, .txt, .xml, or .json format. Maximum file size is 10MB.
              </AlertDescription>
            </Alert>
          )}
          
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
            selectedFile={selectedFile}
            allowedFormats={[".log", ".txt", ".xml", ".json"]}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
          
          <div className="space-x-2">
            {uploadSuccess && (
              <Button
                variant="outline"
                onClick={viewResults}
              >
                View Results
              </Button>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending || uploadSuccess}
            >
              {uploadMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Analyze
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {showProcessingModal && (
        <ProcessingModal
          isOpen={showProcessingModal}
          onClose={closeProcessingModal}
          steps={[
            { name: "Uploading files", status: "complete", progress: 100 },
            { name: "Generating embeddings", status: "in_progress", progress: 50 },
            { name: "Analyzing with LLM", status: "waiting", progress: 0 }
          ]}
          showViewResults={true}
        />
      )}
    </MainLayout>
  );
}
