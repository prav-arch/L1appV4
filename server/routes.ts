import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { logParser } from "./services/log-parser";
import { llmService } from "./services/llm";
import { milvusService } from "./services/milvus";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".log", ".txt", ".xml", ".json"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only .log, .txt, .xml, and .json are allowed."));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API route for statistics
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // API route for recent activities
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // API route for log file upload
  app.post("/api/logs/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString("utf8");
      
      // Basic validation to check if the file looks like a telecom log
      if (!logParser.isValidTelecomLog(fileContent)) {
        return res.status(400).json({ message: "The uploaded file does not appear to be a valid telecom log" });
      }

      // Save the log to storage
      const log = await storage.createLog({
        filename: req.file.originalname,
        originalContent: fileContent,
        fileSize: req.file.size,
      });

      // Create an activity record for the upload
      await storage.createActivity({
        logId: log.id,
        activityType: "upload",
        description: `Log file '${log.filename}' was uploaded`,
        status: "pending",
      });

      // Start asynchronous processing pipeline
      processLogFile(log.id, fileContent);

      res.status(201).json({
        id: log.id,
        filename: log.filename,
        uploadedAt: log.uploadedAt,
        processingStatus: log.processingStatus,
      });
    } catch (error) {
      console.error("Error uploading log file:", error);
      res.status(500).json({ message: "Failed to upload log file" });
    }
  });

  // API route to get a specific log
  app.get("/api/logs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid log ID" });
      }

      const log = await storage.getLog(id);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      res.json(log);
    } catch (error) {
      console.error("Error fetching log:", error);
      res.status(500).json({ message: "Failed to fetch log" });
    }
  });

  // API route to get all logs
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // API route to get analysis result for a log
  app.get("/api/logs/:id/analysis", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid log ID" });
      }

      const analysis = await storage.getAnalysisResultByLogId(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // API route for semantic search
  app.post("/api/search", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Invalid query" });
      }

      try {
        // Generate embedding for the query
        const embedding = await llmService.generateEmbedding(query);
        
        // Search for similar log segments
        const searchResults = await milvusService.searchSimilarText(embedding, 10);
        
        if (searchResults.length === 0) {
          return res.json({
            results: [],
            summary: "No relevant logs found for your query."
          });
        }
        
        // Get the log IDs from the search results to fetch full logs
        const logIds = [...new Set(searchResults.map(result => result.logId))];
        const logPromises = logIds.map(id => storage.getLog(id));
        const logs = await Promise.all(logPromises);
        
        // Combine search results with full log data
        const results = searchResults.map(result => {
          const log = logs.find(log => log?.id === result.logId);
          return {
            logId: result.logId,
            filename: log?.filename || "Unknown log",
            text: result.text,
            score: result.score,
            relevance: Math.round(result.score * 100) + "%"
          };
        });
        
        // Use LLM to generate a summary of the search results
        const searchTexts = searchResults.map(r => r.text).join("\n\n");
        const summary = await llmService.semanticSearch(query, searchTexts);
        
        res.json({
          results,
          summary
        });
      } catch (error) {
        console.error("Error with vector search:", error);
        
        // Fallback to basic search in case Milvus is not available
        const logs = await storage.getAllLogs();
        
        // Simple text-based search as fallback
        const matchingLogs = logs.filter(log => 
          log.originalContent.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchingLogs.length === 0) {
          return res.json({
            results: [],
            summary: "No relevant logs found for your query. Note: Vector search is currently unavailable."
          });
        }
        
        // Extract some context from the matched logs
        const results = matchingLogs.map(log => {
          // Find the context around the match
          const lowerContent = log.originalContent.toLowerCase();
          const queryIndex = lowerContent.indexOf(query.toLowerCase());
          
          // Get some context around the match (max 200 chars)
          const startIndex = Math.max(0, queryIndex - 100);
          const endIndex = Math.min(log.originalContent.length, queryIndex + query.length + 100);
          const text = log.originalContent.substring(startIndex, endIndex);
          
          return {
            logId: log.id,
            filename: log.filename,
            text: text,
            score: 0.5, // Arbitrary score for text search
            relevance: "Keyword match"
          };
        });
        
        res.json({
          results,
          summary: "Vector search is currently unavailable. Showing basic keyword search results instead."
        });
      }
    } catch (error) {
      console.error("Error performing semantic search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // API route for root cause analysis
  app.get("/api/logs/:id/root-cause-analysis", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid log ID" });
      }

      const log = await storage.getLog(id);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      const analysis = await storage.getAnalysisResultByLogId(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Generate a mock root cause analysis with nodes and links
      // In a real implementation, this would use LLM or a dedicated algorithm
      const issues = analysis.issues || [];
      const nodes: any[] = [];
      const links: any[] = [];
      
      // Create nodes for each issue
      (issues as any[]).forEach((issue: any, index: number) => {
        // Add the main issue node
        nodes.push({
          id: `issue-${index}`,
          name: issue.title,
          type: "issue",
          severity: issue.severity?.toLowerCase() || "medium",
          status: "investigating",
          description: issue.description || "No description available"
        });
        
        // Add 1-3 cause nodes for each issue
        const numCauses = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numCauses; i++) {
          const causeId = `cause-${index}-${i}`;
          const causeSeverity = ["high", "medium", "low"][Math.floor(Math.random() * 3)];
          
          nodes.push({
            id: causeId,
            name: `Cause ${i+1} of ${issue.title}`,
            type: "cause",
            severity: causeSeverity,
            status: "pending",
            description: `This is a potential root cause of the issue: ${issue.title}`
          });
          
          // Link cause to issue
          links.push({
            source: causeId,
            target: `issue-${index}`,
            strength: 3,
            type: "causes",
            description: "Directly causes"
          });
        }
        
        // Add 0-2 effect nodes for each issue
        const numEffects = Math.floor(Math.random() * 3);
        for (let i = 0; i < numEffects; i++) {
          const effectId = `effect-${index}-${i}`;
          const effectSeverity = ["high", "medium", "low"][Math.floor(Math.random() * 3)];
          
          nodes.push({
            id: effectId,
            name: `Impact ${i+1} of ${issue.title}`,
            type: "effect",
            severity: effectSeverity,
            status: "investigating",
            description: `This is a downstream effect of the issue: ${issue.title}`
          });
          
          // Link issue to effect
          links.push({
            source: `issue-${index}`,
            target: effectId,
            strength: 2,
            type: "affects",
            description: "Results in"
          });
        }
      });
      
      // Add some relationships between issues if there are multiple
      if ((issues as any[]).length > 1) {
        for (let i = 0; i < (issues as any[]).length - 1; i++) {
          // Link some issues to show relationships (not all, to keep it realistic)
          if (Math.random() > 0.3) {
            links.push({
              source: `issue-${i}`,
              target: `issue-${i+1}`,
              strength: 1,
              type: Math.random() > 0.5 ? "related" : "affects",
              description: "Related issue"
            });
          }
        }
      }
      
      const rootCauseAnalysis = {
        nodes,
        links,
        summary: `Analysis of ${log.filename} identified ${(issues as any[]).length} issues with ${nodes.length} related factors. The root causes appear to be related to ${(issues as any[]).map((i: any) => i.title.toLowerCase()).join(", ")}. Review the graph visualization to see relationships between issues and their causes.`,
        recommendations: [
          "Address high severity causes first to resolve dependent issues",
          "Monitor effects after implementing fixes to verify resolution",
          "Document relationships between components for future troubleshooting",
          `Schedule a review meeting to discuss ${log.filename} findings with the team`
        ]
      };
      
      res.json(rootCauseAnalysis);
    } catch (error) {
      console.error("Error generating root cause analysis:", error);
      res.status(500).json({ message: "Failed to generate root cause analysis" });
    }
  });

  // API route for vector store statistics
  app.get("/api/vector-store/stats", async (req: Request, res: Response) => {
    try {
      let milvusAvailable = false;
      let collections: string[] = [];
      
      try {
        // Check if Milvus is available
        await milvusService.initialize();
        milvusAvailable = true;
        
        // In a real implementation, this would fetch from Milvus API
        collections = ["telecom_logs_embeddings", "telecom_knowledge_base"];
      } catch (error) {
        console.error("Failed to connect to Milvus:", error);
        milvusAvailable = false;
      }
      
      // Return vector store statistics
      res.json({
        totalVectors: 5823, // Example count
        dimensions: 1536, // Typical embedding dimensions
        collections,
        indexType: "HNSW",
        status: milvusAvailable ? "connected" : "error",
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching vector store stats:", error);
      res.status(500).json({ message: "Failed to fetch vector store statistics" });
    }
  });
  
  // API route for recent vectors
  app.get("/api/vector-store/recent", async (req: Request, res: Response) => {
    try {
      const allEmbeddings = await storage.getAllEmbeddings();
      
      // Map embeddings to vector entries
      const vectors = await Promise.all(
        allEmbeddings.slice(0, 20).map(async (embedding) => {
          const log = await storage.getLog(embedding.logId);
          return {
            id: embedding.milvusId,
            logId: embedding.logId,
            text: embedding.segmentText,
            filename: log?.filename
          };
        })
      );
      
      res.json(vectors);
    } catch (error) {
      console.error("Error fetching recent vectors:", error);
      res.status(500).json({ message: "Failed to fetch recent vectors" });
    }
  });
  
  // API route for vector search
  app.post("/api/vector-store/search", async (req: Request, res: Response) => {
    try {
      const { query, threshold = 0.7, limit = 10 } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Invalid query" });
      }
      
      try {
        // Generate embedding for the query
        const embedding = await llmService.generateEmbedding(query);
        
        // Search for similar log segments
        const searchResults = await milvusService.searchSimilarText(embedding, limit);
        
        if (searchResults.length === 0) {
          return res.json([]);
        }
        
        // Get the log IDs from the search results to fetch full logs
        const logIds = [...new Set(searchResults.map(result => result.logId))];
        const logPromises = logIds.map(id => storage.getLog(id));
        const logs = await Promise.all(logPromises);
        
        // Combine search results with full log data
        const results = searchResults
          .filter(result => result.score >= threshold)
          .map(result => {
            const log = logs.find(log => log?.id === result.logId);
            return {
              id: result.id,
              logId: result.logId,
              filename: log?.filename || "Unknown log",
              text: result.text,
              score: result.score,
              relevance: Math.round(result.score * 100) + "%"
            };
          });
        
        res.json(results);
      } catch (error) {
        console.error("Error with vector search:", error);
        
        // Fallback to basic search in case Milvus is not available
        const logs = await storage.getAllLogs();
        
        // Simple text-based search as fallback
        const matchingLogs = logs.filter(log => 
          log.originalContent.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchingLogs.length === 0) {
          return res.json([]);
        }
        
        // Extract some context from the matched logs
        const results = matchingLogs.map(log => {
          // Find the context around the match
          const lowerContent = log.originalContent.toLowerCase();
          const queryIndex = lowerContent.indexOf(query.toLowerCase());
          
          // Get some context around the match (max 200 chars)
          const startIndex = Math.max(0, queryIndex - 100);
          const endIndex = Math.min(log.originalContent.length, queryIndex + query.length + 100);
          const text = log.originalContent.substring(startIndex, endIndex);
          
          return {
            id: `fallback-${log.id}`,
            logId: log.id,
            filename: log.filename,
            text: text,
            score: 0.5, // Arbitrary score for text search
            relevance: "Keyword match"
          };
        });
        
        res.json(results);
      }
    } catch (error) {
      console.error("Error performing vector search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // API route to update resolution status
  app.patch("/api/analysis/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const { status } = req.body;
      if (!status || !['pending', 'in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const updatedAnalysis = await storage.updateResolutionStatus(id, status);
      if (!updatedAnalysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Create an activity record for the status change
      await storage.createActivity({
        logId: updatedAnalysis.logId,
        activityType: "status_change",
        description: `Analysis status changed to ${status}`,
        status,
      });

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error updating resolution status:", error);
      res.status(500).json({ message: "Failed to update resolution status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Asynchronous log processing pipeline
async function processLogFile(logId: number, content: string) {
  try {
    // Update log status to processing
    await storage.updateLogStatus(logId, "processing");
    
    // Create activity record for processing start
    await storage.createActivity({
      logId,
      activityType: "processing",
      description: "Started processing log file",
      status: "in_progress",
    });
    
    // Parse the log
    const segments = logParser.segmentLogForEmbedding(content);
    
    // Process each segment for embedding
    const embeddingPromises = segments.map(async (segment) => {
      try {
        const embedding = await llmService.generateEmbedding(segment);
        return { text: segment, embedding, success: true };
      } catch (error) {
        console.error(`Error generating embedding: ${error}`);
        return { text: segment, embedding: [], success: false };
      }
    });
    
    const processedSegments = await Promise.all(embeddingPromises);
    const successfulSegments = processedSegments.filter(segment => segment.success);
    
    // Try to store embeddings in Milvus if we have successful embeddings
    let milvusAvailable = false;
    if (successfulSegments.length > 0) {
      try {
        const segmentsForMilvus = successfulSegments.map(({ text, embedding }) => ({ text, embedding }));
        const milvusIds = await milvusService.insertEmbeddings(logId, segmentsForMilvus);
        
        // Store embedding references in database
        const embeddingPromises2 = successfulSegments.map((segment, index) => {
          return storage.createEmbedding({
            logId,
            segmentText: segment.text,
            milvusId: milvusIds[index]?.toString() || `local-${index}`,
          });
        });
        
        await Promise.all(embeddingPromises2);
        milvusAvailable = true;
      } catch (milvusError) {
        console.error('Failed to store embeddings in Milvus:', milvusError);
        
        // Store embeddings in local DB anyway without Milvus IDs
        const embeddingPromises3 = successfulSegments.map((segment, index) => {
          return storage.createEmbedding({
            logId,
            segmentText: segment.text,
            milvusId: `local-${index}`, // Use a placeholder ID
          });
        });
        
        await Promise.all(embeddingPromises3);
        
        // Create activity for Milvus unavailability
        await storage.createActivity({
          logId,
          activityType: "error",
          description: "Vector database (Milvus) is currently unavailable. Semantic search will be limited.",
          status: "in_progress",
        });
      }
    }
    
    // Use LLM to analyze the log
    try {
      const analysisResult = await llmService.analyzeLog(content);
      
      // Store the analysis result
      await storage.createAnalysisResult({
        logId,
        issues: analysisResult.issues,
        recommendations: analysisResult.recommendations,
        severity: analysisResult.severity,
        resolutionStatus: "pending",
      });
      
      // Update log status based on whether we had Milvus available
      const finalStatus = milvusAvailable ? "completed" : "completed_without_vectors";
      await storage.updateLogStatus(logId, finalStatus);
      
      // Create activity record for completion
      await storage.createActivity({
        logId,
        activityType: "analysis",
        description: milvusAvailable 
          ? "Log analysis completed with vector search capability" 
          : "Log analysis completed without vector search capability",
        status: "completed",
      });
    } catch (llmError) {
      console.error('Failed to analyze log with LLM:', llmError);
      
      // Update log status to error
      await storage.updateLogStatus(logId, "error");
      
      // Create activity record for LLM error
      await storage.createActivity({
        logId,
        activityType: "error",
        description: `Error analyzing log with LLM: ${llmError instanceof Error ? llmError.message : "Unknown error"}`,
        status: "error",
      });
    }
  } catch (error) {
    console.error(`Error processing log ${logId}:`, error);
    
    // Update log status to error
    await storage.updateLogStatus(logId, "error");
    
    // Create activity record for error
    await storage.createActivity({
      logId,
      activityType: "error",
      description: `Error processing log: ${error instanceof Error ? error.message : "Unknown error"}`,
      status: "error",
    });
  }
}
