import { defineConfig } from "vite";

// Local-only demo: the app refuses non-local origins in src/firebase.ts.
export default defineConfig({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: { outDir: "dist", sourcemap: false },
});
