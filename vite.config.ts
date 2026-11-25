import { defineConfig } from "vite";

/**
 * The live-only variable names a build must never see. `live-local` values are injected into a Vite
 * dev process by `scripts/dev_live_local.py`; if any of them reached a build they would be inlined
 * into `dist` (that is how `import.meta.env` works), so the build refuses instead.
 * `VITE_FIREBASE_APPCHECK_SITE_KEY` is deliberately absent: it is the public reCAPTCHA site key.
 */
const LIVE_ONLY_BUILD_VARS = [
  "VITE_FIREBASE_LIVE_LOCAL",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN",
];

// Local-only default: the app refuses non-local origins in src/runtimeConfig.ts.
export default defineConfig({
  // A production bundle must never carry a live-only value. The guard reads the *resolved* env, so
  // a `.env` file cannot bypass it, and it runs before any output is written.
  plugins: [
    {
      name: "shiftrelay-build-env-guard",
      configResolved(config) {
        if (config.command !== "build") {
          return;
        }
        for (const name of LIVE_ONLY_BUILD_VARS) {
          const value: unknown = config.env[name];
          if (typeof value === "string" && value !== "") {
            throw new Error(`build refused: ${name} must never be embedded in a production bundle`);
          }
        }
      },
    },
  ],
  // The dev server serves the live configuration in `live-local` mode, so it must never answer a
  // cross-origin read: no CORS headers at all, loopback only, strict port.
  server: { host: "127.0.0.1", port: 5173, strictPort: true, cors: false },
  build: { outDir: "dist", sourcemap: false },
});
