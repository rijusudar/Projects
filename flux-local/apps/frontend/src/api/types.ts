// Mirrors apps/backend/app/api/schemas.py. In production these can be generated
// from the backend's OpenAPI schema (packages/shared-types).

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type EditMode =
  | "instruction"
  | "style_transfer"
  | "background"
  | "inpaint"
  | "outpaint";

export interface GenerateBody {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed?: number | null;
  num_images: number;
}

export interface JobRef {
  job_id: string;
  status: JobStatus;
}

export interface ImageMeta {
  id: string;
  job_id: string;
  prompt: string;
  seed: number;
  width: number;
  height: number;
  url: string;
  thumb_url: string;
  created_at: string;
}

export interface JobDetail {
  job_id: string;
  kind: "generate" | "edit";
  status: JobStatus;
  progress: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  images: ImageMeta[];
}

export interface HistoryPage {
  items: ImageMeta[];
  total: number;
  limit: number;
  offset: number;
}

export interface ModelInfo {
  name: string;
  model_id: string;
  device: string;
  quantization: number | null;
  loaded: boolean;
  supports_edit: boolean;
  capabilities: string[];
}

export interface HealthInfo {
  status: string;
  backend_ready: boolean;
  queue_backend: string;
}

export interface BatchRef {
  job_ids: string[];
  count: number;
}

export interface BatchStatus {
  jobs: JobDetail[];
  done: number;
  total: number;
  all_succeeded: boolean;
}

// WebSocket progress events.
export interface ProgressMessage {
  job_id?: string;
  type: "status" | "running" | "progress" | "completed" | "failed" | "ping" | "error";
  step?: number;
  total_steps?: number;
  progress?: number;
  image_ids?: string[];
  error?: string | null;
}
