import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy forwards /api (REST + WS) to the FastAPI backend on :8000 so the
// browser only ever talks to one origin (keeps CORS simple, §9).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
