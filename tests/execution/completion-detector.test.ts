import { describe, it, expect } from "vitest";
import { CompletionDetector } from "../../src/execution/completion-detector.js";

describe("CompletionDetector", () => {
  const detector = new CompletionDetector();

  it("should detect marker completion", () => {
    const result = detector.detect("Response text\n> ", {
      name: "claude",
      marker: "> ",
    });

    expect(result.completed).toBe(true);
    expect(result.reason).toBe("marker");
    expect(result.extractedOutput).toBe("Response text");
  });

  it("should detect error patterns", () => {
    const result = detector.detect("Error: rate limit exceeded", {
      name: "claude",
      marker: "> ",
      errorPatterns: ["rate limit"],
    });

    expect(result.completed).toBe(true);
    expect(result.reason).toBe("error");
    expect(result.error).toContain("rate limit");
  });

  it("should return pending if no completion", () => {
    const result = detector.detect("Partial response", {
      name: "claude",
      marker: "> ",
    });

    expect(result.completed).toBe(false);
    expect(result.reason).toBe("pending");
  });
});
