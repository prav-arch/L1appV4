interface LogSegment {
  text: string;
  timestamp?: string;
  level?: string;
  component?: string;
  message: string;
}

class LogParser {
  // Common telecom log patterns
  private patterns = {
    standard: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+-\s+(.+)$/,
    cisco: /^(\w+\s+\d+\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(\w+):\s+%([^:]+):\s+(.+)$/,
    nokia: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(\w+)\s+(\w+)\s+(.+)$/,
    huawei: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\+\d{2}:\d{2})?)\s+(\w+)\s+(\S+)\s+(.+)$/,
    ericsson: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(\w+)\s+(\w+)\s+(.+)$/
  };

  parseLog(content: string): LogSegment[] {
    // Split the log content into lines
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    return lines.map(line => this.parseLine(line));
  }

  private parseLine(line: string): LogSegment {
    // Try to match the line against each pattern
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const match = line.match(pattern);
      if (match) {
        return {
          text: line,
          timestamp: match[1],
          level: match[2],
          component: match[3],
          message: match[4]
        };
      }
    }
    
    // If no patterns match, just return the line as is
    return {
      text: line,
      message: line
    };
  }

  // Split long logs into manageable chunks for embedding
  segmentLogForEmbedding(content: string, maxChunkSize: number = 512): string[] {
    const segments: string[] = [];
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    let currentChunk = '';
    
    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        segments.push(currentChunk);
        currentChunk = '';
      }
      
      currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
    }
    
    if (currentChunk.length > 0) {
      segments.push(currentChunk);
    }
    
    return segments;
  }

  // Check if content appears to be a valid telecom log
  isValidTelecomLog(content: string): boolean {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Check at least a few lines to determine if this looks like a telecom log
    let matchedLines = 0;
    const linesToCheck = Math.min(lines.length, 5);
    
    for (let i = 0; i < linesToCheck; i++) {
      for (const pattern of Object.values(this.patterns)) {
        if (lines[i].match(pattern)) {
          matchedLines++;
          break;
        }
      }
    }
    
    // If more than half of the checked lines match our patterns, consider it valid
    return matchedLines >= Math.ceil(linesToCheck / 2);
  }
  
  // Extract timestamps from a log for timeline analysis
  extractTimestamps(content: string): { timestamp: string, line: string }[] {
    const result: { timestamp: string, line: string }[] = [];
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    for (const line of lines) {
      // Try to extract timestamp using the patterns
      for (const pattern of Object.values(this.patterns)) {
        const match = line.match(pattern);
        if (match && match[1]) {
          result.push({
            timestamp: match[1],
            line
          });
          break;
        }
      }
    }
    
    return result;
  }
}

export const logParser = new LogParser();
