import { 
  users, type User, type InsertUser,
  logs, type Log, type InsertLog,
  analysisResults, type AnalysisResult, type InsertAnalysisResult,
  embeddings, type Embedding, type InsertEmbedding,
  activities, type Activity, type InsertActivity
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Log methods
  createLog(log: InsertLog): Promise<Log>;
  getLog(id: number): Promise<Log | undefined>;
  getAllLogs(): Promise<Log[]>;
  updateLogStatus(id: number, status: string): Promise<Log | undefined>;
  
  // Analysis methods
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResult(id: number): Promise<AnalysisResult | undefined>;
  getAnalysisResultByLogId(logId: number): Promise<AnalysisResult | undefined>;
  updateResolutionStatus(id: number, status: string): Promise<AnalysisResult | undefined>;
  
  // Embedding methods
  createEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getEmbeddingsByLogId(logId: number): Promise<Embedding[]>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  
  // Dashboard methods
  getStats(): Promise<{
    analyzedLogs: number;
    issuesResolved: number;
    pendingIssues: number;
    avgResolutionTime: string;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private logsData: Map<number, Log>;
  private analysisResultsData: Map<number, AnalysisResult>;
  private embeddingsData: Map<number, Embedding>;
  private activitiesData: Map<number, Activity>;
  
  private userCurrentId: number;
  private logCurrentId: number;
  private analysisResultCurrentId: number;
  private embeddingCurrentId: number;
  private activityCurrentId: number;

  constructor() {
    this.users = new Map();
    this.logsData = new Map();
    this.analysisResultsData = new Map();
    this.embeddingsData = new Map();
    this.activitiesData = new Map();
    
    this.userCurrentId = 1;
    this.logCurrentId = 1;
    this.analysisResultCurrentId = 1;
    this.embeddingCurrentId = 1;
    this.activityCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Log methods
  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = this.logCurrentId++;
    const now = new Date();
    const log: Log = { 
      ...insertLog, 
      id, 
      uploadedAt: now,
      processingStatus: "pending"
    };
    this.logsData.set(id, log);
    return log;
  }
  
  async getLog(id: number): Promise<Log | undefined> {
    return this.logsData.get(id);
  }
  
  async getAllLogs(): Promise<Log[]> {
    return Array.from(this.logsData.values())
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  async updateLogStatus(id: number, status: string): Promise<Log | undefined> {
    const log = this.logsData.get(id);
    if (!log) return undefined;
    
    const updatedLog: Log = {
      ...log,
      processingStatus: status
    };
    
    this.logsData.set(id, updatedLog);
    return updatedLog;
  }
  
  // Analysis methods
  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.analysisResultCurrentId++;
    const now = new Date();
    const result: AnalysisResult = {
      ...insertResult,
      id,
      analysisDate: now
    };
    this.analysisResultsData.set(id, result);
    return result;
  }
  
  async getAnalysisResult(id: number): Promise<AnalysisResult | undefined> {
    return this.analysisResultsData.get(id);
  }
  
  async getAnalysisResultByLogId(logId: number): Promise<AnalysisResult | undefined> {
    return Array.from(this.analysisResultsData.values()).find(
      (result) => result.logId === logId
    );
  }
  
  async updateResolutionStatus(id: number, status: string): Promise<AnalysisResult | undefined> {
    const result = this.analysisResultsData.get(id);
    if (!result) return undefined;
    
    const updatedResult: AnalysisResult = {
      ...result,
      resolutionStatus: status
    };
    
    this.analysisResultsData.set(id, updatedResult);
    return updatedResult;
  }
  
  // Embedding methods
  async createEmbedding(insertEmbedding: InsertEmbedding): Promise<Embedding> {
    const id = this.embeddingCurrentId++;
    const now = new Date();
    const embedding: Embedding = {
      ...insertEmbedding,
      id,
      createdAt: now
    };
    this.embeddingsData.set(id, embedding);
    return embedding;
  }
  
  async getEmbeddingsByLogId(logId: number): Promise<Embedding[]> {
    return Array.from(this.embeddingsData.values())
      .filter(embedding => embedding.logId === logId);
  }
  
  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const now = new Date();
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: now
    };
    this.activitiesData.set(id, activity);
    return activity;
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activitiesData.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Dashboard methods
  async getStats(): Promise<{
    analyzedLogs: number;
    issuesResolved: number;
    pendingIssues: number;
    avgResolutionTime: string;
  }> {
    const completedLogs = Array.from(this.logsData.values())
      .filter(log => log.processingStatus === "completed").length;
      
    const resolvedIssues = Array.from(this.analysisResultsData.values())
      .filter(result => result.resolutionStatus === "resolved").length;
      
    const pendingIssues = Array.from(this.analysisResultsData.values())
      .filter(result => result.resolutionStatus === "pending").length;
    
    // Calculate average resolution time (mock for demo)
    const avgResolutionTime = "2.5h";
    
    return {
      analyzedLogs: completedLogs,
      issuesResolved: resolvedIssues,
      pendingIssues,
      avgResolutionTime
    };
  }
}

export const storage = new MemStorage();
