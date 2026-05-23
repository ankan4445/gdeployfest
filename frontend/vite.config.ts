import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/analyze-email": {
        target: "https://app-187853541252.us-central1.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/credit-check": "http://localhost:8080",
      "/analyze": "http://localhost:8080",
      "/health": "http://localhost:8080",
    },
  },
});
