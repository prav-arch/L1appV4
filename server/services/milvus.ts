import { MilvusClient } from '@zilliz/milvus2-sdk-node';

class MilvusService {
  private client: MilvusClient | null = null;
  private collectionName = 'telecom_logs';
  private dimension = 1536; // Assuming we're using a model with 1536-dimensional embeddings
  private connectionError: Error | null = null;
  private isConnecting: boolean = false;
  
  constructor() {
    // Don't automatically initialize in constructor to prevent startup failures
    // We'll initialize lazily when needed
  }
  
  async initialize() {
    // If already connecting, wait for that attempt to finish
    if (this.isConnecting) {
      return;
    }
    
    // If we already tried and failed, don't retry immediately
    if (this.connectionError) {
      console.log('Milvus connection previously failed, will retry on next request');
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // Connect to Milvus - default to localhost:19530 if not specified
      const host = process.env.MILVUS_HOST || 'localhost';
      const port = parseInt(process.env.MILVUS_PORT || '19530');
      
      console.log(`Attempting to connect to Milvus at ${host}:${port}...`);
      this.client = new MilvusClient({ address: `${host}:${port}` });
      
      // Perform a quick check to see if the connection is working
      await this.client.listCollections();
      
      console.log('Connected to Milvus server successfully');
      this.connectionError = null;
      
      // Check if collection exists, create if it doesn't
      await this.ensureCollection();
    } catch (error) {
      console.error('Failed to initialize Milvus:', error);
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      this.client = null;
    } finally {
      this.isConnecting = false;
    }
  }
  
  private async ensureCollection() {
    if (!this.client) return;
    
    try {
      const hasCollection = await this.client.hasCollection({
        collection_name: this.collectionName,
      });
      
      if (!hasCollection) {
        // Create the collection
        await this.client.createCollection({
          collection_name: this.collectionName,
          fields: [
            {
              name: 'id',
              description: 'ID field',
              data_type: 5, // DataType.Int64
              is_primary_key: true,
              autoID: true,
            },
            {
              name: 'log_id',
              description: 'Log ID from database',
              data_type: 5, // DataType.Int64
            },
            {
              name: 'segment_text',
              description: 'Text segment from log',
              data_type: 21, // DataType.VarChar
              max_length: 65535,
            },
            {
              name: 'embedding',
              description: 'Vector embedding of text',
              data_type: 101, // DataType.FloatVector
              dim: this.dimension,
            },
          ],
        });
        
        // Create an index on the embedding field
        await this.client.createIndex({
          collection_name: this.collectionName,
          field_name: 'embedding',
          extra_params: {
            index_type: 'HNSW',
            metric_type: 'COSINE',
            params: JSON.stringify({ M: 8, efConstruction: 64 }),
          },
        });
        
        console.log(`Created collection ${this.collectionName}`);
      }
      
      // Load collection into memory for search
      await this.client.loadCollection({
        collection_name: this.collectionName,
      });
      
    } catch (error) {
      console.error('Error setting up Milvus collection:', error);
    }
  }
  
  async insertEmbeddings(logId: number, segments: { text: string, embedding: number[] }[]) {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        throw new Error('Milvus client is not initialized');
      }
    }
    
    try {
      // Convert to array of objects as per Milvus SDK requirements
      const insertData = segments.map(segment => ({
        log_id: logId,
        segment_text: segment.text,
        embedding: segment.embedding
      }));
      
      // Insert data into Milvus
      const result = await this.client.insert({
        collection_name: this.collectionName,
        data: insertData,
      });
      
      // Return generated IDs or create placeholders if not available
      if (result && Array.isArray(result.insertIds)) {
        return result.insertIds.map(id => ({ id }));
      } else {
        // Fallback if Milvus doesn't return IDs as expected
        return segments.map((_, index) => ({ id: `local-${index}` }));
      }
    } catch (error) {
      console.error('Error inserting embeddings:', error);
      throw error;
    }
  }
  
  async searchSimilarText(embedding: number[], limit: number = 10) {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        throw new Error('Milvus client is not initialized');
      }
    }
    
    try {
      const results = await this.client.search({
        collection_name: this.collectionName,
        vectors: [embedding],
        vector_type: 101, // Using constant for FloatVector type
        search_params: {
          anns_field: 'embedding',
          topk: limit.toString(),
          metric_type: 'COSINE',
          params: JSON.stringify({ ef: 32 }),
        },
        output_fields: ['log_id', 'segment_text'],
      });
      
      if (results.results.length === 0) {
        return [];
      }
      
      return results.results.map(hit => ({
        logId: hit.log_id,
        text: hit.segment_text,
        score: hit.score,
      }));
    } catch (error) {
      console.error('Error searching similar text:', error);
      throw error;
    }
  }
}

export const milvusService = new MilvusService();
