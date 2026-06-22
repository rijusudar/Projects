import { api } from "../api/client";
import type { ImageMeta } from "../api/types";

interface Props {
  image: ImageMeta;
  onSelect?: (img: ImageMeta) => void;
  onDelete?: (id: string) => void;
  onEdit?: (img: ImageMeta) => void;
}

export function ImageCard({ image, onSelect, onDelete, onEdit }: Props) {
  return (
    <figure className="card group relative overflow-hidden">
      <button
        className="block w-full"
        onClick={() => onSelect?.(image)}
        aria-label={`Open image: ${image.prompt}`}
      >
        <img
          src={api.thumbUrl(image.id)}
          alt={image.prompt || "generated image"}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      </button>
      <figcaption className="space-y-1 p-2">
        <p className="line-clamp-2 text-xs text-slate-400" title={image.prompt}>
          {image.prompt || "—"}
        </p>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>
            {image.width}×{image.height} · seed {image.seed}
          </span>
        </div>
      </figcaption>
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
        {onEdit && (
          <button
            className="rounded bg-ink/80 px-2 py-1 text-[10px] hover:bg-accent hover:text-ink"
            onClick={() => onEdit(image)}
          >
            Edit
          </button>
        )}
        <a
          className="rounded bg-ink/80 px-2 py-1 text-[10px] hover:bg-accent hover:text-ink"
          href={api.imageUrl(image.id)}
          download={`${image.id}.png`}
        >
          ↓
        </a>
        {onDelete && (
          <button
            className="rounded bg-ink/80 px-2 py-1 text-[10px] hover:bg-red-500"
            onClick={() => onDelete(image.id)}
            aria-label="Delete image"
          >
            ✕
          </button>
        )}
      </div>
    </figure>
  );
}
