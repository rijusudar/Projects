import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../../api/client";
import { ImageCard } from "../../components/ImageCard";
import { cacheImages, getCachedImages } from "../../lib/dexie";
import { useUiStore } from "../../stores/useUiStore";

export function Gallery() {
  const qc = useQueryClient();
  const selectImage = useUiStore((s) => s.selectImage);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const page = await api.history(120, 0);
      // Mirror to IndexedDB for offline browsing.
      await cacheImages(page.items);
      return page;
    },
  });

  // Offline fallback: if the network query failed, read the local cache.
  useEffect(() => {
    if (isError) {
      getCachedImages(120).then((cached) =>
        qc.setQueryData(["history"], { items: cached, total: cached.length, limit: 120, offset: 0 }),
      );
    }
  }, [isError, qc]);

  const del = useMutation({
    mutationFn: (id: string) => api.deleteImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });

  if (isLoading) {
    return <div className="card flex h-48 items-center justify-center text-sm text-slate-500">Loading history…</div>;
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-slate-500">
        No images yet. Generate something to fill your gallery.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">
          History · {data?.total ?? items.length} image(s)
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {items.map((img) => (
          <ImageCard
            key={img.id}
            image={img}
            onSelect={(img) => selectImage(img.id)}
            onDelete={(id) => del.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
