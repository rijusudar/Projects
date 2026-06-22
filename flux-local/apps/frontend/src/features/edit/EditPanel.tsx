import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import type { EditMode, ImageMeta } from "../../api/types";
import { ImageCard } from "../../components/ImageCard";
import { ProgressBar } from "../../components/Progress";
import { useJobProgress } from "../../hooks/useJobProgress";
import { useUiStore } from "../../stores/useUiStore";
import { MaskCanvas, type MaskCanvasHandle } from "./MaskCanvas";

const MODES: { value: EditMode; label: string; hint: string; needsMask: boolean }[] = [
  { value: "instruction", label: "Instruction", hint: "Describe the change", needsMask: false },
  { value: "style_transfer", label: "Style transfer", hint: "Restyle the whole image", needsMask: false },
  { value: "background", label: "Background", hint: "Replace the background", needsMask: false },
  { value: "inpaint", label: "Inpaint / object", hint: "Paint the region to change", needsMask: true },
];

export function EditPanel() {
  const qc = useQueryClient();
  const selectImage = useUiStore((s) => s.selectImage);

  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<EditMode>("instruction");
  const [strength, setStrength] = useState(0.8);
  const [steps, setSteps] = useState(4);
  const [faceSafe, setFaceSafe] = useState(true);
  const [brush, setBrush] = useState(36);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<ImageMeta[]>([]);
  const maskRef = useRef<MaskCanvasHandle>(null);

  const progress = useJobProgress(jobId);
  const needsMask = MODES.find((m) => m.value === mode)?.needsMask ?? false;

  const previewUrl = useMemo(
    () => (files[0] ? URL.createObjectURL(files[0]) : null),
    [files],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("mode", mode);
      form.set("strength", String(strength));
      form.set("steps", String(steps));
      form.set("face_safe", String(faceSafe));
      files.forEach((f) => form.append("images", f));
      if (needsMask) {
        const blob = await maskRef.current?.exportMask();
        if (blob) form.append("mask", blob, "mask.png");
      }
      return api.edit(form);
    },
    onSuccess: (ref) => {
      setResults([]);
      setJobId(ref.job_id);
    },
  });

  useEffect(() => {
    if (progress.status === "completed" && jobId) {
      api.job(jobId).then((d) => {
        setResults(d.images);
        qc.invalidateQueries({ queryKey: ["history"] });
      });
    }
  }, [progress.status, jobId, qc]);

  const busy =
    mutation.isPending || progress.status === "connecting" || progress.status === "running";
  const canSubmit = files.length > 0 && prompt.trim().length > 0 && !busy;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="upload">
            Source image(s) — first is primary, extras are references
          </label>
          <input
            id="upload"
            type="file"
            accept="image/*"
            multiple
            className="field"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {previewUrl &&
          (needsMask ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="label mb-0">Paint the region to edit</span>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  onClick={() => maskRef.current?.clear()}
                >
                  Clear mask
                </button>
              </div>
              <MaskCanvas ref={maskRef} src={previewUrl} brush={brush} />
              <label className="block">
                <span className="label">Brush · {brush}px</span>
                <input
                  type="range"
                  min={8}
                  max={96}
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="source preview"
              className="max-h-64 w-full rounded-md border border-edge object-contain"
            />
          ))}

        <div>
          <span className="label">Edit mode</span>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`rounded-md border px-2 py-2 text-left text-xs transition ${
                  mode === m.value
                    ? "border-accent bg-accent/10"
                    : "border-edge hover:border-accent"
                }`}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-[10px] text-slate-500">{m.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="editPrompt">
            Instruction
          </label>
          <textarea
            id="editPrompt"
            className="field min-h-[72px] resize-y"
            placeholder="make the sky a dramatic sunset"
            value={prompt}
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
              onChange={(e) => setStrength(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="label">Steps · {steps}</span>
            <input
              type="range"
              min={1}
              max={30}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={faceSafe}
            onChange={(e) => setFaceSafe(e.target.checked)}
          />
          Face-safe editing (preserve faces)
        </label>

        <button
          className="btn-primary w-full"
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
        >
          {busy ? "Editing…" : "Apply edit"}
        </button>

        <ProgressBar state={progress} />
        {mutation.isError && (
          <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
        )}
      </div>

      <div>
        {results.length === 0 ? (
          <div className="card flex h-64 items-center justify-center text-sm text-slate-500">
            {busy ? "Applying your edit…" : "Edited results will appear here."}
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
