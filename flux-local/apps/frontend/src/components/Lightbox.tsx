import { useEffect } from "react";
import { api } from "../api/client";
import { useUiStore } from "../stores/useUiStore";

export function Lightbox() {
  const id = useUiStore((s) => s.selectedImageId);
  const close = () => useUiStore.getState().selectImage(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (id) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img
          src={api.imageUrl(id)}
          alt="full resolution"
          className="max-h-[80vh] rounded-lg object-contain"
        />
        <div className="flex gap-2">
          <a className="btn-primary" href={api.imageUrl(id)} download={`${id}.png`}>
            Download PNG
          </a>
          <button className="btn-ghost" onClick={close}>
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
