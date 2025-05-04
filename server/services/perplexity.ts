/**
 * Perplexity API Service
 * Provides access to the Perplexity AI API for enhanced natural language search capabilities
 */

import { log } from '../vite';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityCompletionParams {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface PerplexityCompletionResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class PerplexityService {
  private apiKey: string | null = null;
  private apiUrl = 'https://api.perplexity.ai/chat/completions';
  private defaultModel = 'llama-3.1-sonar-small-128k-online';
  
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || null;
    
    if (this.apiKey) {
      log('Perplexity API service initialized with API key');
    } else {
      log('Perplexity API service initialized without API key. Some advanced search features will be limited.');
    }
  }
  
  /**
   * Check if the Perplexity API is available (i.e., API key is set)
   */
  public isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Generate a completion from Perplexity API
   */
  public async generateCompletion(
    messages: PerplexityMessage[],
    options: Partial<PerplexityCompletionParams> = {}
  ): Promise<PerplexityCompletionResponse | null> {
    if (!this.apiKey) {
      log('Perplexity API key not set. Cannot generate completion.');
      return null;
    }
    
    try {
      const params: PerplexityCompletionParams = {
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.9,
        search_domain_filter: options.search_domain_filter,
        return_images: options.return_images ?? false,
        return_related_questions: options.return_related_questions ?? false,
        search_recency_filter: options.search_recency_filter || 'month',
        top_k: options.top_k ?? 0,
        stream: false, // Always use non-streaming mode for simplicity
        presence_penalty: options.presence_penalty ?? 0,
        frequency_penalty: options.frequency_penalty ?? 1,
      };
      
      // Add max_tokens if specified
      if (options.max_tokens !== undefined) {
        params.max_tokens = options.max_tokens;
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json() as PerplexityCompletionResponse;
      return result;
    } catch (error) {
      console.error('Error calling Perplexity API:', error);
      return null;
    }
  }
  
  /**
   * Enhanced log analysis using Perplexity API
   * Uses online search to find similar issues in public knowledge bases
   */
  public async analyzeLogWithContext(content: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a telecom network expert tasked with analyzing log files. ' +
                'Use your knowledge and the web to find relevant information about error patterns, ' + 
                'known issues, and best practices for resolution. Be specific and actionable in your analysis.'
      },
      {
        role: 'user',
        content: `Analyze this telecom network log and identify issues, their likely causes, and recommended solutions. ` +
                `Add relevant technical details from official documentation where helpful:\n\n${content}`
      }
    ];
    
    try {
      const result = await this.generateCompletion(messages, {
        temperature: 0.1,
        search_recency_filter: 'month',
        max_tokens: 2048,
      });
      
      if (!result || !result.choices || result.choices.length === 0) {
        return null;
      }
      
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error analyzing log with Perplexity:', error);
      return null;
    }
  }
  
  /**
   * Perform an advanced semantic search with online context
   */
  public async semanticSearchWithContext(query: string, logContext: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a telecom network expert assistant that helps analyze and find information in network logs. ' +
                'Use the web to supplement your knowledge where necessary, but focus on answering based on the provided logs.'
      },
      {
        role: 'user',
        content: `I'm searching for information about "${query}" in my telecom logs. Here are the relevant log snippets:\n\n${logContext}\n\n` +
                'Based on these logs and relevant technical knowledge, what can you tell me about this issue? ' +
                'Include information about what might be causing it and how to resolve it.'
      }
    ];
    
    try {
      const result = await this.generateCompletion(messages, {
        temperature: 0.2,
        search_recency_filter: 'month',
      });
      
      if (!result || !result.choices || result.choices.length === 0) {
        return null;
      }
      
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error performing semantic search with Perplexity:', error);
      return null;
    }
  }
}

export const perplexityService = new PerplexityService();