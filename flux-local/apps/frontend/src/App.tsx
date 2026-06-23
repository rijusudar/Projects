import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import { Lightbox } from "./components/Lightbox";
import { BatchPanel } from "./features/batch/BatchPanel";
import { EditPanel } from "./features/edit/EditPanel";
import { GeneratePanel } from "./features/generate/GeneratePanel";
import { Gallery } from "./features/history/Gallery";
import { useUiStore, type Tab } from "./stores/useUiStore";

const TABS: { id: Tab; label: string }[] = [
  { id: "generate", label: "Generate" },
  { id: "edit", label: "Edit" },
  { id: "batch", label: "Batch" },
  { id: "history", label: "History" },
];

function BackendBadge() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 5000,
  });
  const { data: models } = useQuery({ queryKey: ["models"], queryFn: api.models });
  const ready = data?.backend_ready;
  const model = models?.[0];
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span
        className={`inline-block h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`}
        aria-hidden
      />
      {model ? `${model.name} · ${model.model_id.split("/").pop()}` : "connecting…"}
      {model?.quantization ? ` · int${model.quantization}` : ""}
    </div>
  );
}

export default function App() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4 py-5">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            flux<span className="text-accent">·</span>local
          </h1>
          <nav className="flex gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  tab === t.id ? "bg-panel text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <BackendBadge />
      </header>

      <main className="flex-1">
        {tab === "generate" && <GeneratePanel />}
        {tab === "edit" && <EditPanel />}
        {tab === "batch" && <BatchPanel />}
        {tab === "history" && <Gallery />}
      </main>

      <Lightbox />
    </div>
  );
}
