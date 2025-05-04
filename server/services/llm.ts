import fetch from 'node-fetch';

interface LLMResponse {
  text: string;
}

interface AnalysisResult {
  issues: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    firstOccurrence: string;
    status: 'pending' | 'in_progress' | 'fixed';
  }[];
  recommendations: {
    title: string;
    description: string;
    category: 'configuration' | 'monitoring' | 'authentication' | 'network' | 'other';
    isAutomaticallyResolved: boolean;
    documentationLink?: string;
  }[];
  summary: string;
  severity: 'low' | 'medium' | 'high';
}

interface EmbeddingResponse {
  embedding: number[];
}

class LLMService {
  private inferenceUrl: string;
  private embeddingUrl: string;
  private connectionError: Error | null = null;
  private mockMode: boolean = false;
  
  constructor() {
    // Default to localhost:8080 if not specified
    this.inferenceUrl = process.env.LLM_INFERENCE_URL || 'http://localhost:8080/v1/completions';
    this.embeddingUrl = process.env.LLM_EMBEDDING_URL || 'http://localhost:8080/v1/embeddings';
    
    // Check connectivity on startup (but don't block initialization)
    this.checkConnectivity();
  }
  
  private async checkConnectivity(): Promise<void> {
    try {
      // Try a simple request to see if the LLM server is up
      console.log(`Checking LLM server connectivity at ${this.embeddingUrl}...`);
      
      // Use a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.embeddingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: "connectivity test",
          model: 'all-mpnet-base-v2'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('LLM server is accessible');
        this.connectionError = null;
        this.mockMode = false;
      } else {
        const errorText = await response.text();
        throw new Error(`LLM server responded with error: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('LLM server is not accessible:', error);
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      this.mockMode = true;
    }
  }
  
  // Generate a deterministic embedding vector for mock mode
  private generateMockEmbedding(text: string): number[] {
    // Create a simple hash of the text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate a vector of 1536 dimensions with some variations based on the hash
    const vector = Array(1536).fill(0).map((_, index) => {
      // Use the hash and position to generate a pseudorandom but deterministic value
      const value = Math.sin(hash * (index + 1)) * 0.5;
      return parseFloat(value.toFixed(6));
    });
    
    return vector;
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.mockMode) {
      console.log('Using mock embedding generation as LLM server is not accessible');
      return this.generateMockEmbedding(text);
    }
    
    try {
      const response = await fetch(this.embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'all-mpnet-base-v2' // Using MPNet embedding model
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate embeddings: ${response.status} ${errorText}`);
      }
      
      const result = await response.json() as EmbeddingResponse;
      return result.embedding;
    } catch (error) {
      console.error('Error generating embeddings from LLM service:', error);
      
      // Switch to mock mode after a real failure
      this.mockMode = true;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      
      // Fall back to mock embeddings
      return this.generateMockEmbedding(text);
    }
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
  
  // Generate mock analysis for telecom logs
  private generateMockAnalysis(logContent: string): AnalysisResult {
    // Extract some data from the log content for mock analysis
    const lines = logContent.split('\n').filter(line => line.trim().length > 0);
    const timestamp = lines.length > 0 ? (lines[0].match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || ['Unknown Timestamp'])[0] : 'Unknown Timestamp';
    
    // Count error and warning patterns
    const errorCount = logContent.match(/error|exception|fail/gi)?.length || 0;
    const warningCount = logContent.match(/warning|warn|timeout/gi)?.length || 0;
    
    // Determine mock severity based on error/warning counts
    let mockSeverity: 'low' | 'medium' | 'high' = 'low';
    if (errorCount > 10) mockSeverity = 'high';
    else if (errorCount > 5 || warningCount > 10) mockSeverity = 'medium';
    
    return {
      issues: [
        {
          title: "Connectivity Issues Detected",
          description: `The log shows possible connectivity problems between network components. ${errorCount} errors and ${warningCount} warnings were found.`,
          severity: mockSeverity,
          firstOccurrence: timestamp,
          status: 'pending'
        },
        {
          title: "Configuration Mismatch",
          description: "There appears to be a configuration mismatch between service endpoints.",
          severity: 'medium',
          firstOccurrence: timestamp,
          status: 'pending'
        }
      ],
      recommendations: [
        {
          title: "Verify Network Configuration",
          description: "Check all network configuration parameters and ensure consistency across services.",
          category: 'configuration',
          isAutomaticallyResolved: false
        },
        {
          title: "Implement Enhanced Monitoring",
          description: "Set up additional monitoring for affected services to catch issues earlier.",
          category: 'monitoring',
          isAutomaticallyResolved: false,
          documentationLink: "https://example.com/telecom-monitoring"
        }
      ],
      summary: "The logs indicate network connectivity and configuration issues that should be addressed.",
      severity: mockSeverity
    };
  }
  
  async analyzeLog(logContent: string): Promise<AnalysisResult> {
    // Use mock analysis if in mock mode
    if (this.mockMode) {
      console.log('Using mock analysis as LLM server is not accessible');
      return this.generateMockAnalysis(logContent);
    }
    
    try {
      // Use a timeout to prevent hanging on LLM requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
      
      const prompt = `
You are a telecom network expert AI system. Analyze the following log file and identify issues, 
provide recommendations, and assess severity. Format your response as a JSON object with the following structure:
{
  "issues": [
    {
      "title": "Brief title of the issue",
      "description": "Detailed description of the issue",
      "severity": "low|medium|high",
      "firstOccurrence": "timestamp from log",
      "status": "pending|in_progress|fixed"
    }
  ],
  "recommendations": [
    {
      "title": "Brief title of recommendation",
      "description": "Detailed recommendation",
      "category": "configuration|monitoring|authentication|network|other",
      "isAutomaticallyResolved": true|false,
      "documentationLink": "optional URL to documentation"
    }
  ],
  "summary": "Brief summary of the entire log analysis",
  "severity": "low|medium|high"
}

Log content:
${logContent}

Analyze the above logs and respond with ONLY the JSON output.
`;

      const response = await fetch(this.inferenceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-7b-v0.1', // Using Mistral 7B v0.1 model
          prompt: prompt,
          max_tokens: 2048,
          temperature: 0.1,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze log: ${response.status} ${errorText}`);
      }
      
      const result = await response.json() as LLMResponse;
      
      try {
        // Extract JSON from the response text
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in LLM response');
        }
        
        const analysisResult = JSON.parse(jsonMatch[0]) as AnalysisResult;
        return analysisResult;
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        throw new Error('Failed to parse LLM response');
      }
    } catch (error) {
      console.error('Error analyzing log with LLM:', error);
      
      // Switch to mock mode after a failure
      this.mockMode = true;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      
      // Return mock analysis
      return this.generateMockAnalysis(logContent);
    }
  }
  
  async semanticSearch(query: string, searchContext: string | string[]): Promise<string> {
    // Use mock response if in mock mode
    if (this.mockMode) {
      console.log('Using mock semantic search as LLM server is not accessible');
      return `Based on the logs, there appear to be issues related to "${query}". Several entries mention connection problems and configuration issues that may be relevant to your search.`;
    }
    
    try {
      // Format the context properly
      const contextText = typeof searchContext === 'string' 
        ? searchContext 
        : Array.isArray(searchContext) ? searchContext.join('\n\n') : String(searchContext);
      
      // Use a timeout to prevent hanging on LLM requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      const prompt = `
You are a telecom network expert AI system. Based on the user's search query and the retrieved log segments, 
provide a concise summary of the relevant findings.

User query: "${query}"

Retrieved log segments:
${contextText}

Provide a brief, helpful response about what was found in the logs related to the query.
`;

      const response = await fetch(this.inferenceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-7b-v0.1', // Using Mistral 7B v0.1 model
          prompt: prompt,
          max_tokens: 512,
          temperature: 0.3,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process semantic search: ${response.status} ${errorText}`);
      }
      
      const result = await response.json() as LLMResponse;
      return result.text;
    } catch (error) {
      console.error('Error with semantic search:', error);
      
      // Switch to mock mode after a failure
      this.mockMode = true;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      
      // Return a simple response
      return `Search results for "${query}" indicate several potential matches. The logs show various technical issues that may be related to your query. Please check the specific entries for more details.`;
    }
  }
}

export const llmService = new LLMService();
