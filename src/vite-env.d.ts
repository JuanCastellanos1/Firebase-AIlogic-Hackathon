/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_EMULATOR_HOST?: string;
  /** Set to "1" by `scripts/dev_live_local.py` only; never present in a build. */
  readonly VITE_FIREBASE_LIVE_LOCAL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Public reCAPTCHA Enterprise site key; the only live value a build may embed. */
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  /** Secret localhost-only App Check debug token; dev runner only. */
  readonly VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
