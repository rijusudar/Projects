"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex cursor-pointer items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
    >
      <Printer className="size-4" /> Save as PDF
    </button>
  );
}
