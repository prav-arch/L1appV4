import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadLog } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProcessingModal } from "@/components/modals/processing-modal";

interface UploadPanelProps {
  className?: string;
}

export function UploadPanel({ className }: UploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const uploadMutation = useMutation({
    mutationFn: uploadLog,
    onSuccess: () => {
      setShowModal(true);
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
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
  };
  
  const handleFileClear = () => {
    setSelectedFile(null);
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
  
  const closeModal = () => {
    setShowModal(false);
    setSelectedFile(null);
  };
  
  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle>Upload Telecom Logs</CardTitle>
          <CardDescription>Upload log files for AI-powered analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload 
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
            selectedFile={selectedFile}
          />
          
          {selectedFile && (
            <div className="mt-4 flex justify-end">
              <Button 
                className="bg-secondary hover:bg-indigo-600" 
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Uploading...
                  </>
                ) : (
                  "Analyze Logs"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {showModal && (
        <ProcessingModal
          isOpen={showModal} 
          onClose={closeModal}
          steps={[
            { name: "Uploading files", status: "complete", progress: 100 },
            { name: "Generating embeddings", status: "in_progress", progress: 50 },
            { name: "Analyzing with LLM", status: "waiting", progress: 0 }
          ]}
        />
      )}
    </>
  );
}
