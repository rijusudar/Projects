import { create } from "zustand";

export type Tab = "generate" | "edit" | "batch" | "history";

interface UiState {
  tab: Tab;
  setTab: (t: Tab) => void;
  // The job currently being watched for live progress (either feature).
  activeJobId: string | null;
  setActiveJob: (id: string | null) => void;
  selectedImageId: string | null;
  selectImage: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  tab: "generate",
  setTab: (tab) => set({ tab }),
  activeJobId: null,
  setActiveJob: (activeJobId) => set({ activeJobId }),
  selectedImageId: null,
  selectImage: (selectedImageId) => set({ selectedImageId }),
}));
