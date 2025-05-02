import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, FileUp, CheckCircle, Network } from "lucide-react";
import { API_BASE_URL } from "../config";

export function PcapUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useNavigate();

  const upload = useMutation({
    mutationFn: async (formData: FormData) => {
      const xhr = new XMLHttpRequest();
      
      const promise = new Promise<{ id: number; message: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });
        
        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });
      });
      
      xhr.open("POST", `${API_BASE_URL}/pcap/upload`);
      xhr.send(formData);
      
      return promise;
    },
    onSuccess: (data) => {
      toast({
        title: "PCAP Upload Successful",
        description: "Your PCAP file has been uploaded and is being analyzed.",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      // Navigate to the analysis page after a delay
      setTimeout(() => {
        navigate(`/logs/${data.id}`);
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check if file is a PCAP file
    const validExtensions = [".pcap", ".pcapng", ".cap"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PCAP file (.pcap, .pcapng, or .cap)",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "PCAP file size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }
    
    setFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a PCAP file to upload",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    setUploadProgress(0);
    upload.mutate(formData);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2 text-primary" />
          Upload PCAP File
        </CardTitle>
        <CardDescription>
          Upload a packet capture file for network traffic analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragOver ? "border-primary bg-primary/5" : "border-slate-300"
            } transition-colors cursor-pointer`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("pcap-file-input")?.click()}
          >
            <input
              type="file"
              id="pcap-file-input"
              accept=".pcap,.pcapng,.cap"
              className="hidden"
              onChange={handleFileChange}
              disabled={upload.isPending}
            />
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <FileUp className="h-12 w-12 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800">
                  {file ? file.name : "Drag & Drop your PCAP file here"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Or click to browse"}
                </p>
              </div>
              
              {!file && (
                <Badge variant="outline" className="font-normal">
                  .pcap, .pcapng, .cap up to 50MB
                </Badge>
              )}
              
              {file && !upload.isPending && (
                <Button type="button" onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }} variant="ghost" size="sm">
                  Remove file
                </Button>
              )}
            </div>
          </div>
          
          {upload.isPending && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-slate-500">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          {upload.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
              <span>
                {upload.error instanceof Error
                  ? upload.error.message
                  : "An error occurred during upload"}
              </span>
            </div>
          )}
          
          {upload.isSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span>PCAP file uploaded successfully! Redirecting to analysis page...</span>
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={!file || upload.isPending}
          >
            {upload.isPending ? "Uploading..." : "Upload PCAP File"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-xs text-slate-500">
        PCAP files will be analyzed for network traffic patterns and telecom protocol data
      </CardFooter>
    </Card>
  );
}