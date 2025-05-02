import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  Database, 
  Server, 
  Brain, 
  Save, 
  FolderSync, 
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  // Default to localhost:19530 for Milvus
  const [milvusSettings, setMilvusSettings] = useState({
    host: "localhost",
    port: "19530",
  });
  
  // Default to localhost:8080 for LLM server
  const [llmSettings, setLlmSettings] = useState({
    inferenceUrl: "http://localhost:8080/v1/completions",
    embeddingUrl: "http://localhost:8080/v1/embeddings",
    model: "mistral-7b"
  });
  
  const [appSettings, setAppSettings] = useState({
    autoProcessLogs: true,
    storageEnabled: true,
    maxFileSize: "10"
  });
  
  const handleSaveSettings = () => {
    // In a real application, this would save the settings to the backend
    toast({
      title: "Settings Saved",
      description: "Your settings have been successfully updated.",
    });
  };
  
  const handleTestMilvusConnection = () => {
    // In a real application, this would test the connection to Milvus
    toast({
      title: "Milvus Connection",
      description: "Successfully connected to Milvus server."
    });
  };
  
  const handleTestLLMConnection = () => {
    // In a real application, this would test the connection to the LLM server
    toast({
      title: "LLM Connection",
      description: "Successfully connected to LLM inference server."
    });
  };
  
  return (
    <MainLayout title="Settings">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Application Settings</h1>
        <p className="text-slate-500">
          Configure the TelecomAI Troubleshooter application settings
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Milvus Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Milvus Vector Database
            </CardTitle>
            <CardDescription>
              Configure connection to Milvus for semantic search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="milvus-host">Host</Label>
              <Input 
                id="milvus-host" 
                value={milvusSettings.host}
                onChange={(e) => setMilvusSettings({...milvusSettings, host: e.target.value})}
                placeholder="localhost" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="milvus-port">Port</Label>
              <Input 
                id="milvus-port" 
                value={milvusSettings.port}
                onChange={(e) => setMilvusSettings({...milvusSettings, port: e.target.value})}
                placeholder="19530" 
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleTestMilvusConnection}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </CardFooter>
        </Card>
        
        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              LLM Configuration
            </CardTitle>
            <CardDescription>
              Configure connection to local Language Model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="llm-inference">Inference Endpoint</Label>
              <Input 
                id="llm-inference" 
                value={llmSettings.inferenceUrl}
                onChange={(e) => setLlmSettings({...llmSettings, inferenceUrl: e.target.value})}
                placeholder="http://localhost:8080/v1/completions" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="llm-embedding">Embedding Endpoint</Label>
              <Input 
                id="llm-embedding" 
                value={llmSettings.embeddingUrl}
                onChange={(e) => setLlmSettings({...llmSettings, embeddingUrl: e.target.value})}
                placeholder="http://localhost:8080/v1/embeddings" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="llm-model">Model Name</Label>
              <Input 
                id="llm-model" 
                value={llmSettings.model}
                onChange={(e) => setLlmSettings({...llmSettings, model: e.target.value})}
                placeholder="mistral-7b" 
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleTestLLMConnection}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Application Settings
          </CardTitle>
          <CardDescription>
            General application configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-process">Automatic Log Processing</Label>
              <p className="text-sm text-slate-500">
                Automatically process logs upon upload
              </p>
            </div>
            <Switch 
              id="auto-process" 
              checked={appSettings.autoProcessLogs}
              onCheckedChange={(checked) => 
                setAppSettings({...appSettings, autoProcessLogs: checked})
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="storage-enabled">Enable Log Storage</Label>
              <p className="text-sm text-slate-500">
                Store log content in the database
              </p>
            </div>
            <Switch 
              id="storage-enabled" 
              checked={appSettings.storageEnabled}
              onCheckedChange={(checked) => 
                setAppSettings({...appSettings, storageEnabled: checked})
              }
            />
          </div>
          
          <Separator />
          
          <div className="grid gap-2">
            <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
            <Input 
              id="max-file-size" 
              type="number"
              value={appSettings.maxFileSize}
              onChange={(e) => setAppSettings({...appSettings, maxFileSize: e.target.value})}
              placeholder="10" 
            />
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Changes to these settings may require a restart of the application.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </MainLayout>
  );
}
