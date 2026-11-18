/**
 * Firebase wiring for exactly three explicit modes (see `src/runtimeConfig.ts`).
 *
 * - `emulator` (default on a local host): `demo-shiftrelay` Auth/Firestore emulators, no App Check.
 * - `live-local`: the real project with the registered localhost App Check debug token. The debug
 *   token is assigned to the documented `self.FIREBASE_APPCHECK_DEBUG_TOKEN` global before App Check
 *   initialization, is forwarded by the dev-only runner and never appears in a build.
 * - `hostedQA`: the real project with reCAPTCHA Enterprise and no debug token.
 *
 * Auth persists only in memory and Firestore uses a memory cache in every mode: no credential or
 * private draft survives a reload, sign-out or member revocation. App Check is initialized here,
 * before any AI Logic request can be made.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { connectAuthEmulator, initializeAuth, inMemoryPersistence } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { resolveRuntimeConfig, type RuntimeConfig } from "./runtimeConfig";

/**
 * Only the names `resolveRuntimeConfig` reads, referenced one by one: Vite inlines exactly these
 * references, so an unrelated `VITE_*` value present at build time cannot reach the bundle. The
 * live-only names sit behind the statically replaced `DEV` flag, so a production build tree-shakes
 * the branch instead of carrying a secret reference. `vite.config.ts` still refuses such a build.
 */
const devEnv: Readonly<Record<string, string | undefined>> = import.meta.env.DEV
  ? {
      VITE_FIREBASE_LIVE_LOCAL: import.meta.env.VITE_FIREBASE_LIVE_LOCAL,
      VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
      VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN,
    }
  : {};

const buildEnv: Readonly<Record<string, string | undefined>> = {
  ...devEnv,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_EMULATOR_HOST: import.meta.env.VITE_EMULATOR_HOST,
  VITE_FIREBASE_APPCHECK_SITE_KEY: import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY,
};

export const runtimeConfig: RuntimeConfig = await resolveRuntimeConfig({
  env: buildEnv,
  hostname: typeof location === "undefined" ? "" : location.hostname,
  fetchJson: async (url: string) => {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`config endpoint ${url} answered ${response.status}`);
    }
    return (await response.json()) as unknown;
  },
});

export const app: FirebaseApp = initializeApp(
  runtimeConfig.mode === "emulator"
    ? {
        projectId: runtimeConfig.projectId,
        apiKey: "demo-shiftrelay-local-key",
        authDomain: `${runtimeConfig.emulatorHost}:9099`,
        appId: "demo-shiftrelay-local-app",
      }
    : runtimeConfig.firebase,
  { automaticDataCollectionEnabled: false },
);

export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });

function initAppCheck(config: RuntimeConfig): AppCheck | null {
  if (config.mode === "emulator") {
    return null;
  }
  const plan = config.appCheck;
  if (import.meta.env.DEV && plan.kind === "debug-token") {
    // Documented debug-provider global, development builds only: the token is a secret that exists
    // only in the dev runner's child process, and a production bundle has no reference to it.
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      plan.debugToken;
  }
  return initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(plan.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const appCheck: AppCheck | null = initAppCheck(runtimeConfig);

if (runtimeConfig.mode === "emulator") {
  connectAuthEmulator(auth, `http://${runtimeConfig.emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, runtimeConfig.emulatorHost, 8080);
}
