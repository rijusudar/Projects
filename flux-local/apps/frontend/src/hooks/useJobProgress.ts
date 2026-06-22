import { useEffect, useRef, useState } from "react";
import { progressSocketUrl } from "../api/client";
import type { ProgressMessage } from "../api/types";

export interface JobProgressState {
  status: "idle" | "connecting" | "running" | "completed" | "failed";
  progress: number; // 0..1
  step: number;
  totalSteps: number;
  imageIds: string[];
  error: string | null;
}

const INITIAL: JobProgressState = {
  status: "idle",
  progress: 0,
  step: 0,
  totalSteps: 0,
  imageIds: [],
  error: null,
};

/**
 * Subscribes to /jobs/{id}/progress over WebSocket and exposes live state.
 * Pass null to reset/disconnect. Handles keepalive pings and terminal events.
 */
export function useJobProgress(jobId: string | null): JobProgressState {
  const [state, setState] = useState<JobProgressState>(INITIAL);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState(INITIAL);
      return;
    }
    setState({ ...INITIAL, status: "connecting" });
    const ws = new WebSocket(progressSocketUrl(jobId));
    socketRef.current = ws;

    ws.onmessage = (e) => {
      const msg: ProgressMessage = JSON.parse(e.data);
      switch (msg.type) {
        case "ping":
          return;
        case "running":
        case "status":
          setState((s) => ({ ...s, status: "running" }));
          return;
        case "progress":
          setState((s) => ({
            ...s,
            status: "running",
            progress: msg.progress ?? s.progress,
            step: msg.step ?? s.step,
            totalSteps: msg.total_steps ?? s.totalSteps,
          }));
          return;
        case "completed":
          setState((s) => ({
            ...s,
            status: "completed",
            progress: 1,
            imageIds: msg.image_ids ?? [],
          }));
          return;
        case "failed":
        case "error":
          setState((s) => ({
            ...s,
            status: "failed",
            error: msg.error ?? "job failed",
          }));
          return;
      }
    };

    ws.onerror = () =>
      setState((s) =>
        s.status === "completed" ? s : { ...s, status: "failed", error: "connection error" },
      );

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [jobId]);

  return state;
}
