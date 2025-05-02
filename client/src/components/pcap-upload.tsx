import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  UploadCloud, 
  FileUp, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Network,
  Wifi,
  Database,
  Router
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "../components/ui/spinner";
import { API_BASE_URL } from "../config";

export function PcapUpload() {
  const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch analysis results after upload
  const analysisResults = useQuery({
    queryKey: [`${API_BASE_URL}/pcap/${uploadedFileId}/analysis`],
    enabled: uploadedFileId !== null,
  });
  
  useEffect(() => {
    if (uploadComplete && uploadedFileId) {
      // Refetch analysis results when upload completes
      analysisResults.refetch();
    }
  }, [uploadComplete, uploadedFileId, analysisResults]);
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${API_BASE_URL}/pcap/upload`, true);
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 90); // Show up to 90% for upload
          setUploadProgress(progress);
        }
      });
      
      return new Promise<{id: number, filename: string}>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100); // Set to 100% on success
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new Error(`HTTP error! Status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error occurred during upload'));
        };
        
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      // Store the uploaded file ID
      setUploadedFileId(data.id);
      setUploadProgress(100);
      setUploadComplete(true);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setUploadProgress(0);
    }
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };
  
  const handleUpload = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    setUploadProgress(0);
    uploadMutation.mutate(formData);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setSelectedFile(event.dataTransfer.files[0]);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2 text-primary" />
          PCAP File Analysis
        </CardTitle>
        <CardDescription>
          Upload packet capture files for network traffic analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {uploadMutation.isPending ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" className="text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading {selectedFile?.name}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              {uploadProgress === 100 && (
                <div className="flex items-center justify-center text-green-600 gap-1 pt-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Upload successful!</span>
                </div>
              )}
            </div>
          </div>
        ) : uploadMutation.isError ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Upload failed</p>
            <p className="text-slate-500 text-sm mb-4">
              {uploadMutation.error instanceof Error 
                ? uploadMutation.error.message 
                : 'An unknown error occurred'}
            </p>
            <Button onClick={() => uploadMutation.reset()}>Try Again</Button>
          </div>
        ) : (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                selectedFile ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    className="mt-2"
                  >
                    Select a different file
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <UploadCloud className="h-12 w-12 text-slate-400 mx-auto" />
                  <div>
                    <p className="font-medium text-slate-900">Drag and drop your PCAP file here</p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Select PCAP File
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pcap,.pcapng"
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            {/* Info section about PCAP files */}
            <div className="mt-6 bg-slate-50 p-4 rounded-md">
              <h3 className="text-sm font-medium mb-3">What can be analyzed in PCAP files?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <Wifi className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Network Protocols</h4>
                    <p className="text-xs text-slate-500">Analyze protocol usage and distribution</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <Database className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Traffic Patterns</h4>
                    <p className="text-xs text-slate-500">Identify flow characteristics and volume</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <Shield className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Security Issues</h4>
                    <p className="text-xs text-slate-500">Detect anomalies and potential threats</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <Router className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Telecom Protocols</h4>
                    <p className="text-xs text-slate-500">Analyze specialized telecom protocols</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-xs text-slate-500">Supported file formats: .pcap, .pcapng</p>
        
        {selectedFile && !uploadMutation.isPending && (
          <Button onClick={handleUpload} disabled={!selectedFile}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload and Analyze
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}