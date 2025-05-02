import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Logs table to store uploaded log files
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalContent: text("original_content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  fileSize: integer("file_size").notNull(),
  processingStatus: text("processing_status").notNull().default("pending"),
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  uploadedAt: true,
  processingStatus: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Log analysis results table
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull().references(() => logs.id),
  issues: jsonb("issues").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  severity: text("severity").notNull(),
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  resolutionStatus: text("resolution_status").notNull().default("pending"),
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({
  id: true,
  analysisDate: true,
});

export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;

// Vector embeddings for semantic search
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull().references(() => logs.id),
  segmentText: text("segment_text").notNull(),
  milvusId: text("milvus_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;
export type Embedding = typeof embeddings.$inferSelect;

// Activity records for dashboard
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").references(() => logs.id),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
