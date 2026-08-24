import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist-renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        control: resolve(__dirname, "index.html"),
        overlay: resolve(__dirname, "overlay.html")
      }
    }
  }
});
