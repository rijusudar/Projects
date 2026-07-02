import { Info } from "lucide-react";

/** Visible marker for sections whose content is not in the resume. */
export function PlaceholderNote({ text }: { text: string }) {
  return (
    <div className="mx-auto mb-10 flex max-w-2xl items-start gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3 text-left">
      <Info className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-accent">Placeholder — </span>
        {text}
      </p>
    </div>
  );
}
