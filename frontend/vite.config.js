import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: true,
    minify: "esbuild",
    reportCompressedSize: false,
    // Three.js is intentionally isolated behind the lazy 3D Core Inspector.
    chunkSizeWarningLimit: 650,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          map: ["d3", "d3-geo", "d3-zoom", "topojson-client"],
          three: ["three"]
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false
      },
    }
  }
});
