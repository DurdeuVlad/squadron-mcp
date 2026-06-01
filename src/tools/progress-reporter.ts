export type ProgressStatus = "pending" | "in-progress" | "completed" | "failed";

export interface ProgressUpdate {
  step: number;
  totalSteps: number;
  currentAction: string;
  status: ProgressStatus;
  timeElapsedMs: number;
}

export class ProgressReporter {
  private readonly startedAt = Date.now();
  private readonly updates: ProgressUpdate[] = [];

  constructor(private readonly totalSteps: number) {}

  report(step: number, action: string, status: ProgressStatus): ProgressUpdate {
    const update: ProgressUpdate = {
      step,
      totalSteps: this.totalSteps,
      currentAction: action,
      status,
      timeElapsedMs: Date.now() - this.startedAt,
    };
    this.updates.push(update);
    return update;
  }

  getUpdates(): ProgressUpdate[] {
    return [...this.updates];
  }

  formatUpdate(update: ProgressUpdate): string {
    const icon =
      update.status === "completed"
        ? "OK"
        : update.status === "failed"
          ? "FAIL"
          : update.status === "in-progress"
            ? "RUN"
            : "WAIT";
    const elapsedSeconds = (update.timeElapsedMs / 1000).toFixed(1);
    return `${icon} [${update.step}/${update.totalSteps}] ${update.currentAction} (${elapsedSeconds}s)`;
  }

  summary(): string {
    const completed = this.updates.filter((item) => item.status === "completed").length;
    const failed = this.updates.filter((item) => item.status === "failed").length;
    const totalSeconds = ((Date.now() - this.startedAt) / 1000).toFixed(1);

    return `Workflow progress: completed ${completed}/${this.totalSteps}, failed ${failed}, elapsed ${totalSeconds}s`;
  }
}
