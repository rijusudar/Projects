import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { EditMode, ImageMeta } from "../../api/types";
import { ImageCard } from "../../components/ImageCard";
import { useUiStore } from "../../stores/useUiStore";

const MODES: { value: EditMode; label: string }[] = [
  { value: "instruction", label: "Instruction" },
  { value: "style_transfer", label: "Style transfer" },
  { value: "background", label: "Background replace" },
];

interface BatchJob {
  id: string;
  filename: string;
  status: "queued" | "running" | "succeeded" | "failed";
  images: ImageMeta[];
  error: string | null;
}

export function BatchPanel() {
  const qc = useQueryClient();
  const selectImage = useUiStore((s) => s.selectImage);

  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<EditMode>("instruction");
  const [strength, setStrength] = useState(0.75);
  const [steps, setSteps] = useState(4);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("mode", mode);
      form.set("strength", String(strength));
      form.set("steps", String(steps));
      files.forEach((f) => form.append("images", f));
      return api.batchEdit(form);
    },
    onSuccess: (ref) => {
      setJobIds(ref.job_ids);
      setFileNames(files.map((f) => f.name));
    },
  });

  // Poll batch status until all jobs are terminal.
  const { data: batchStatus, refetch } = useQuery({
    queryKey: ["batch-status", jobIds],
    queryFn: () => api.batchStatus(jobIds),
    enabled: jobIds.length > 0,
    refetchInterval: false,
  });

  useEffect(() => {
    if (jobIds.length === 0) return;
    pollRef.current = setInterval(() => {
      refetch().then((r) => {
        if (r.data?.done === r.data?.total) {
          clearInterval(pollRef.current!);
          qc.invalidateQueries({ queryKey: ["history"] });
        }
      });
    }, 800);
    return () => clearInterval(pollRef.current!);
  }, [jobIds, refetch, qc]);

  const batchJobs: BatchJob[] = (batchStatus?.jobs ?? []).map((j, i) => ({
    id: j.job_id,
    filename: fileNames[i] ?? j.job_id.slice(0, 8),
    status: j.status as BatchJob["status"],
    images: j.images,
    error: j.error,
  }));

  const busy = mutation.isPending;
  const canSubmit = files.length > 0 && prompt.trim().length > 0 && !busy && jobIds.length === 0;
  const done = batchStatus?.done ?? 0;
  const total = batchStatus?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="batch-upload">
            Images (up to 20) — each gets the same edit applied
          </label>
          <input
            id="batch-upload"
            type="file"
            accept="image/*"
            multiple
            className="field"
            disabled={jobIds.length > 0}
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []));
              setJobIds([]);
            }}
          />
          {files.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">{files.length} image(s) selected</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={jobIds.length > 0}
              onClick={() => setMode(m.value)}
              className={`rounded-md border px-2 py-2 text-xs transition ${
                mode === m.value
                  ? "border-accent bg-accent/10"
                  : "border-edge hover:border-accent"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="batch-prompt">
            Edit instruction
          </label>
          <textarea
            id="batch-prompt"
            className="field min-h-[64px] resize-y"
            placeholder="convert to pencil sketch"
            value={prompt}
            disabled={jobIds.length > 0}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Strength · {strength}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={strength}
              disabled={jobIds.length > 0}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="label">Steps · {steps}</span>
            <input
              type="range"
              min={1}
              max={20}
              value={steps}
              disabled={jobIds.length > 0}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            className="btn-primary flex-1"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {busy ? "Submitting…" : `Apply to ${files.length || "?"} image(s)`}
          </button>
          {jobIds.length > 0 && (
            <button
              className="btn-ghost"
              onClick={() => {
                setJobIds([]);
                setFiles([]);
                setFileNames([]);
              }}
            >
              New batch
            </button>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
        )}

        {total > 0 && (
          <div className="space-y-1" role="status" aria-live="polite">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>
                {done}/{total} done
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
              <div
                className={`h-full transition-all duration-300 ${
                  batchStatus?.all_succeeded ? "bg-emerald-500" : "bg-accent"
                }`}
                style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Per-image results */}
      {batchJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">Results</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {batchJobs.map((job) => (
              <div key={job.id} className="card overflow-hidden">
                <div className="flex items-center justify-between bg-edge/40 px-3 py-2">
                  <span className="truncate text-xs text-slate-300" title={job.filename}>
                    {job.filename}
                  </span>
                  <StatusBadge status={job.status} />
                </div>
                {job.status === "succeeded" && job.images.length > 0 ? (
                  <ImageCard
                    image={job.images[0]}
                    onSelect={(img) => selectImage(img.id)}
                  />
                ) : job.status === "failed" ? (
                  <div className="flex h-24 items-center justify-center p-2 text-xs text-red-400">
                    {job.error ?? "failed"}
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-slate-500">
                    {job.status === "running" ? "Processing…" : "Queued"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BatchJob["status"] }) {
  const map: Record<BatchJob["status"], string> = {
    queued: "text-slate-400",
    running: "text-amber-400",
    succeeded: "text-emerald-400",
    failed: "text-red-400",
  };
  return <span className={`text-[10px] font-medium uppercase ${map[status]}`}>{status}</span>;
}
