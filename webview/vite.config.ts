import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "",            // prod'ta relative asset path
  build: {
    outDir: "dist",
    assetsDir: "assets",
    manifest: true,
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",   // localhost yerine 127.0.0.1 daha az sürpriz çıkarır
    port: 5173,
    strictPort: true,

    // 🔑 CORS başlıkları — webview'dan ESM import/fetch için şart
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      // (opsiyonel) bazı ortamlar için işe yarıyor:
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    },

    // 🔌 HMR ve mutlak origin
    hmr: {
      protocol: "ws",
      host: "127.0.0.1",
      port: 5173,
    },
    origin: "http://127.0.0.1:5173",
  },
});
