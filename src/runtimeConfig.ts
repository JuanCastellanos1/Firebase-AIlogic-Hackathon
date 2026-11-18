/**
 * Explicit runtime mode resolution. Exactly three modes exist:
 *
 * - `emulator` (default on a local host): the `demo-shiftrelay` Auth/Firestore emulators only.
 * - `live-local` (local host + the dev runner's `VITE_FIREBASE_LIVE_LOCAL=1`): the real project read
 *   from the outside-root private file, with the registered localhost App Check debug token.
 * - `hostedQA` (one of the two approved Hosting origins): the real project's public config fetched
 *   from the same-origin Hosting endpoint `/__/firebase/init.json` at runtime, with the production
 *   reCAPTCHA Enterprise site key from the build.
 *
 * Everything else fails closed with a named `RuntimeConfigError`. No mode ever falls back to another
 * one, so a missing or mismatched configuration can never become a silent cloud request. Error
 * messages carry a code and a plain reason, never a configuration value.
 */

export const DEMO_PROJECT_ID = "demo-shiftrelay";
export const LIVE_PROJECT_ID = "shiftrelay-hybridai-2026";
/** Public web app id (documented in `docs/adr/0003-cloud-ai-setup.md`); not a credential. */
export const LIVE_APP_ID = "1:1013230596333:web:a0b89365ee59732eb85ce4";
export const LOCAL_HOSTS: readonly string[] = ["127.0.0.1", "localhost"];
export const HOSTED_QA_HOSTS: readonly string[] = [
  "shiftrelay-hybridai-2026.web.app",
  "shiftrelay-hybridai-2026.firebaseapp.com",
];
/** Same-origin Hosting config endpoint. Reserved-URL support for the modular SDK is unproven. */
export const HOSTED_INIT_PATH = "/__/firebase/init.json";

/** Names the live-local dev runner forwards; values never enter source, argv, logs or a build. */
export const LIVE_ENV_NAMES = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_APPCHECK_SITE_KEY",
  "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN",
] as const;

export const RUNTIME_ERROR_CODES = [
  "unknown_origin",
  "non_local_emulator",
  "wrong_project",
  "wrong_app",
  "live_local_incomplete",
  "site_key_missing",
  "hosted_config_unavailable",
  "hosted_config_invalid",
] as const;

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

export class RuntimeConfigError extends Error {
  readonly code: RuntimeErrorCode;
  readonly reason: string;

  constructor(code: RuntimeErrorCode, reason: string) {
    super(`${code}: ${reason}`);
    this.name = "RuntimeConfigError";
    this.code = code;
    this.reason = reason;
  }
}

export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly messagingSenderId: string;
  readonly appId: string;
}

export type AppCheckConfig =
  | { readonly kind: "none" }
  | { readonly kind: "debug-token"; readonly siteKey: string; readonly debugToken: string }
  | { readonly kind: "recaptcha-enterprise"; readonly siteKey: string };

export type RuntimeConfig =
  | {
      readonly mode: "emulator";
      readonly projectId: string;
      readonly emulatorHost: string;
      readonly appCheck: { readonly kind: "none" };
    }
  | {
      readonly mode: "live-local";
      readonly firebase: FirebaseWebConfig;
      readonly appCheck: { readonly kind: "debug-token"; readonly siteKey: string; readonly debugToken: string };
    }
  | {
      readonly mode: "hostedQA";
      readonly firebase: FirebaseWebConfig;
      readonly appCheck: { readonly kind: "recaptcha-enterprise"; readonly siteKey: string };
    };

export interface RuntimeInput {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly hostname: string;
  /** Same-origin fetch used only by `hostedQA`; injected so the resolver stays testable. */
  readonly fetchJson: (url: string) => Promise<unknown>;
}

function required(env: RuntimeInput["env"], name: string): string {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new RuntimeConfigError(
      "live_local_incomplete",
      `the live-local dev runner did not supply ${name}`,
    );
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function resolveEmulator(env: RuntimeInput["env"]): RuntimeConfig {
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? DEMO_PROJECT_ID;
  const emulatorHost = env.VITE_EMULATOR_HOST ?? "127.0.0.1";
  if (projectId !== DEMO_PROJECT_ID) {
    throw new RuntimeConfigError(
      "wrong_project",
      "the emulator mode only runs the demo-shiftrelay emulator project",
    );
  }
  if (!LOCAL_HOSTS.includes(emulatorHost)) {
    throw new RuntimeConfigError("non_local_emulator", "the emulator host must be a local address");
  }
  return {
    mode: "emulator",
    projectId,
    emulatorHost,
    appCheck: { kind: "none" },
  };
}

function resolveLiveLocal(env: RuntimeInput["env"]): RuntimeConfig {
  const apiKey = required(env, "VITE_FIREBASE_API_KEY");
  const authDomain = required(env, "VITE_FIREBASE_AUTH_DOMAIN");
  const projectId = required(env, "VITE_FIREBASE_PROJECT_ID");
  const messagingSenderId = required(env, "VITE_FIREBASE_MESSAGING_SENDER_ID");
  const siteKey = required(env, "VITE_FIREBASE_APPCHECK_SITE_KEY");
  const debugToken = required(env, "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN");
  if (projectId !== LIVE_PROJECT_ID) {
    throw new RuntimeConfigError("wrong_project", "the supplied project is not the approved project");
  }
  // The private file keeps the public app id commented out, so it defaults to the documented id.
  const appId = env.VITE_FIREBASE_APP_ID ?? LIVE_APP_ID;
  if (appId !== LIVE_APP_ID) {
    throw new RuntimeConfigError("wrong_app", "the supplied web app is not the approved web app");
  }
  if (!siteKey.startsWith("6L")) {
    throw new RuntimeConfigError("site_key_missing", "the App Check site key does not look like a reCAPTCHA key");
  }
  return {
    mode: "live-local",
    firebase: { apiKey, authDomain, projectId, messagingSenderId, appId },
    appCheck: { kind: "debug-token", siteKey, debugToken },
  };
}

async function resolveHosted(env: RuntimeInput["env"], fetchJson: RuntimeInput["fetchJson"]): Promise<RuntimeConfig> {
  const siteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  const siteKeyValue = typeof siteKey === "string" && siteKey.startsWith("6L") ? siteKey : null;
  if (siteKeyValue === null) {
    // Nothing is fetched and no Firebase app is created without a production attestation provider.
    throw new RuntimeConfigError(
      "site_key_missing",
      "this build carries no reCAPTCHA Enterprise site key, so the hosted build cannot attest",
    );
  }
  let payload: unknown;
  try {
    payload = await fetchJson(HOSTED_INIT_PATH);
  } catch {
    throw new RuntimeConfigError(
      "hosted_config_unavailable",
      "the same-origin Hosting config endpoint could not be read",
    );
  }
  if (!isPlainObject(payload)) {
    throw new RuntimeConfigError("hosted_config_invalid", "the Hosting config response is not an object");
  }
  const apiKey = text(payload, "apiKey");
  const authDomain = text(payload, "authDomain");
  const projectId = text(payload, "projectId");
  const messagingSenderId = text(payload, "messagingSenderId");
  const appId = text(payload, "appId");
  if (apiKey === null || authDomain === null || projectId === null || messagingSenderId === null || appId === null) {
    throw new RuntimeConfigError("hosted_config_invalid", "the Hosting config is missing a required field");
  }
  if (projectId !== LIVE_PROJECT_ID) {
    throw new RuntimeConfigError("wrong_project", "the Hosting config names a different project");
  }
  if (appId !== LIVE_APP_ID) {
    throw new RuntimeConfigError("wrong_app", "the Hosting config names a different web app");
  }
  return {
    mode: "hostedQA",
    firebase: { apiKey, authDomain, projectId, messagingSenderId, appId },
    appCheck: { kind: "recaptcha-enterprise", siteKey: siteKeyValue },
  };
}

/** Resolves the single active mode. Throws `RuntimeConfigError` instead of degrading. */
export async function resolveRuntimeConfig(input: RuntimeInput): Promise<RuntimeConfig> {
  const host = input.hostname.toLowerCase();
  if (HOSTED_QA_HOSTS.includes(host)) {
    return resolveHosted(input.env, input.fetchJson);
  }
  if (!LOCAL_HOSTS.includes(host)) {
    throw new RuntimeConfigError(
      "unknown_origin",
      "this origin is neither a local development host nor an approved Hosting origin",
    );
  }
  if (input.env.VITE_FIREBASE_LIVE_LOCAL === "1") {
    return resolveLiveLocal(input.env);
  }
  return resolveEmulator(input.env);
}

/** One sentence for the page; never contains a configuration value. */
export function describeRuntimeFailure(error: unknown): string {
  if (error instanceof RuntimeConfigError) {
    return `This build will not start the live configuration (${error.code}: ${error.reason}). No cloud request was made.`;
  }
  return "This build could not resolve its Firebase configuration. No cloud request was made.";
}

/** User-facing mode sentence, so the page never claims "emulators only" while a live mode is active. */
export function describeRuntimeMode(config: RuntimeConfig): string {
  switch (config.mode) {
    case "emulator":
      return "Local demonstration · synthetic data · Firebase emulators only";
    case "live-local":
      return "Live project on localhost · synthetic data · App Check debug token";
    case "hostedQA":
      return "Live project on Hosting · synthetic data · App Check reCAPTCHA Enterprise";
  }
}
