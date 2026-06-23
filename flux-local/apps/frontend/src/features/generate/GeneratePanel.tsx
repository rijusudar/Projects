import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { GenerateBody, ImageMeta } from "../../api/types";
import { ImageCard } from "../../components/ImageCard";
import { ProgressBar } from "../../components/Progress";
import { useJobProgress } from "../../hooks/useJobProgress";
import { useUiStore } from "../../stores/useUiStore";

const PRESETS: { label: string; patch: Partial<GenerateBody> }[] = [
  { label: "Square 512", patch: { width: 512, height: 512 } },
  { label: "Portrait 512×768", patch: { width: 512, height: 768 } },
  { label: "Landscape 768×512", patch: { width: 768, height: 512 } },
];

export function GeneratePanel() {
  const qc = useQueryClient();
  const selectImage = useUiStore((s) => s.selectImage);

  const [body, setBody] = useState<GenerateBody>({
    prompt: "",
    negative_prompt: "",
    width: 512,
    height: 512,
    steps: 4,
    guidance: 3.5,
    seed: null,
    num_images: 1,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<ImageMeta[]>([]);

  const progress = useJobProgress(jobId);

  const mutation = useMutation({
    mutationFn: () => api.generate(body),
    onSuccess: (ref) => {
      setResults([]);
      setJobId(ref.job_id);
    },
  });

  // When the job completes, fetch the produced image metadata.
  useEffect(() => {
    if (progress.status === "completed" && jobId) {
      api.job(jobId).then((detail) => {
        setResults(detail.images);
        qc.invalidateQueries({ queryKey: ["history"] });
      });
    }
  }, [progress.status, jobId, qc]);

  const set = <K extends keyof GenerateBody>(k: K, v: GenerateBody[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const busy =
    mutation.isPending || progress.status === "connecting" || progress.status === "running";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* --- controls --- */}
      <form
        className="card space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.prompt.trim()) mutation.mutate();
        }}
      >
        <div>
          <label className="label" htmlFor="prompt">
            Prompt
          </label>
          <textarea
            id="prompt"
            className="field min-h-[88px] resize-y"
            placeholder="a tiny robot tending a bonsai, soft studio light"
            value={body.prompt}
            onChange={(e) => set("prompt", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="neg">
            Negative prompt
          </label>
          <input
            id="neg"
            className="field"
            placeholder="blurry, low quality"
            value={body.negative_prompt}
            onChange={(e) => set("negative_prompt", e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              onClick={() => setBody((b) => ({ ...b, ...p.patch }))}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Width">
            <input
              type="number"
              step={8}
              min={64}
              max={1536}
              className="field"
              value={body.width}
              onChange={(e) => set("width", Number(e.target.value))}
            />
          </Field>
          <Field label="Height">
            <input
              type="number"
              step={8}
              min={64}
              max={1536}
              className="field"
              value={body.height}
              onChange={(e) => set("height", Number(e.target.value))}
            />
          </Field>
          <Field label={`Steps · ${body.steps}`}>
            <input
              type="range"
              min={1}
              max={30}
              className="w-full"
              value={body.steps}
              onChange={(e) => set("steps", Number(e.target.value))}
            />
          </Field>
          <Field label={`Guidance · ${body.guidance}`}>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              className="w-full"
              value={body.guidance}
              onChange={(e) => set("guidance", Number(e.target.value))}
            />
          </Field>
          <Field label="Seed (blank = random)">
            <input
              type="number"
              min={0}
              className="field"
              value={body.seed ?? ""}
              onChange={(e) =>
                set("seed", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Images">
            <input
              type="number"
              min={1}
              max={4}
              className="field"
              value={body.num_images}
              onChange={(e) => set("num_images", Number(e.target.value))}
            />
          </Field>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy || !body.prompt.trim()}>
          {busy ? "Generating…" : "Generate"}
        </button>

        <ProgressBar state={progress} />
        {mutation.isError && (
          <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
        )}
      </form>

      {/* --- results --- */}
      <div>
        {results.length === 0 ? (
          <div className="card flex h-64 items-center justify-center text-sm text-slate-500">
            {busy ? "Rendering your image…" : "Generated images will appear here."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {results.map((img) => (
              <ImageCard key={img.id} image={img} onSelect={(img) => selectImage(img.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
