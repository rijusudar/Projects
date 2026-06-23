import type { JobProgressState } from "../hooks/useJobProgress";

export function ProgressBar({ state }: { state: JobProgressState }) {
  if (state.status === "idle") return null;

  const pct = Math.round(state.progress * 100);
  const labels: Record<JobProgressState["status"], string> = {
    idle: "",
    connecting: "Connecting…",
    running: state.totalSteps
      ? `Denoising · step ${state.step}/${state.totalSteps}`
      : "Working…",
    completed: "Done",
    failed: state.error ?? "Failed",
  };

  const tone =
    state.status === "failed"
      ? "bg-red-500"
      : state.status === "completed"
        ? "bg-emerald-500"
        : "bg-accent";

  return (
    <div className="space-y-1" role="status" aria-live="polite">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{labels[state.status]}</span>
        {state.status === "running" && <span>{pct}%</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
        <div
          className={`h-full ${tone} transition-all duration-200`}
          style={{ width: state.status === "running" ? `${pct}%` : "100%" }}
        />
      </div>
    </div>
  );
}
