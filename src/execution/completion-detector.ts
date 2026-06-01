export interface CompletionStrategy {
  name: string;
  marker?: string | RegExp;
  timeout?: number;
  minOutputLength?: number;
  errorPatterns?: Array<string | RegExp>;
}

export interface CompletionResult {
  completed: boolean;
  reason: "marker" | "timeout" | "error" | "pending";
  extractedOutput: string;
  error?: string;
}

export class CompletionDetector {
  detect(outputStream: string, strategy: CompletionStrategy): CompletionResult {
    // Check error patterns first
    if (strategy.errorPatterns) {
      for (const pattern of strategy.errorPatterns) {
        const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
        if (regex.test(outputStream)) {
          return {
            completed: true,
            reason: "error",
            extractedOutput: outputStream,
            error: `Error pattern matched: ${pattern}`,
          };
        }
      }
    }

    // Check for completion marker
    if (strategy.marker) {
      const regex = typeof strategy.marker === "string"
        ? new RegExp(this.escapeRegExp(strategy.marker))
        : strategy.marker;
      
      const match = outputStream.match(regex);
      if (match) {
        const content = outputStream.slice(0, match.index).trim();
        return {
          completed: true,
          reason: "marker",
          extractedOutput: content,
        };
      }
    }

    // Check minimum output length
    if (strategy.minOutputLength && outputStream.length >= strategy.minOutputLength) {
      return {
        completed: true,
        reason: "timeout",
        extractedOutput: outputStream,
      };
    }

    return {
      completed: false,
      reason: "pending",
      extractedOutput: outputStream,
    };
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
