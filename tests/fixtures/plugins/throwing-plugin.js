// Simulates a plugin file that fails during module evaluation (e.g. a
// broken import, a top-level assertion, a syntax-adjacent runtime error).
throw new Error("boom: this plugin fails to import");
