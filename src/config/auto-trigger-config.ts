export interface AutoTriggerConfig {
  enabled: boolean;
  minConfidence: number;
  yoloConfidence: number;
  askFirst: boolean;
  confirmationTimeout: number;
  contextDetectionEnabled: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = value !== undefined ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAutoTriggerConfig(): AutoTriggerConfig {
  return {
    enabled: process.env.AUTO_TRIGGER_WORKFLOWS !== "false",
    minConfidence: clamp(readNumber(process.env.AUTO_TRIGGER_CONFIDENCE, 0.8), 0, 1),
    yoloConfidence: clamp(readNumber(process.env.YOLO_MODE_CONFIDENCE, 0.95), 0, 1),
    askFirst: process.env.AUTO_TRIGGER_ASK_FIRST !== "false",
    confirmationTimeout: Math.max(0, Math.floor(readNumber(process.env.CONFIRMATION_TIMEOUT, 3000))),
    contextDetectionEnabled: process.env.CONTEXT_DETECTION_ENABLED !== "false",
  };
}
