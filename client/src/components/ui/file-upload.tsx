import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  className?: string;
  allowedFormats?: string[];
  maxSize?: number; // in bytes
  selectedFile?: File | null;
}

export function FileUpload({
  onFileSelect,
  onFileClear,
  className,
  allowedFormats = [".log", ".txt", ".xml", ".json"],
  maxSize = 10 * 1024 * 1024, // 10MB default
  selectedFile
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    // Check file size
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${formatFileSize(maxSize)}`,
        variant: "destructive",
      });
      return;
    }

    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedFormats.includes(extension)) {
      toast({
        title: "Invalid file type",
        description: `Allowed formats: ${allowedFormats.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    onFileSelect(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={className}>
      {!selectedFile ? (
        <div
          className={cn(
            "mb-5 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 p-8 text-center transition-colors",
            isDragging && "border-primary bg-primary/5",
            className
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="mb-2 text-slate-600">Drag and drop log files here</p>
          <p className="text-xs text-slate-500 mb-4">
            Supported formats: {allowedFormats.join(", ")}
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="default"
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFormats.join(",")}
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-3">
            <div className="flex items-center">
              <i className="fas fa-file-alt text-slate-400 mr-2"></i>
              <span className="text-sm">{selectedFile.name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-slate-500 mr-3">
                {formatFileSize(selectedFile.size)}
              </span>
              <button
                className="text-slate-400 hover:text-red-500"
                onClick={onFileClear}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
