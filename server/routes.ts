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
