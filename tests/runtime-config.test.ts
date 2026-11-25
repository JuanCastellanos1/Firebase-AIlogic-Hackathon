import { describe, expect, it } from "vitest";
import contrato from "./fixtures/contrato.json";
import {
  DEMO_PROJECT_ID,
  HOSTED_INIT_PATH,
  HOSTED_QA_HOSTS,
  LIVE_APP_ID,
  LIVE_ENV_NAMES,
  LIVE_PROJECT_ID,
  LOCAL_HOSTS,
  RUNTIME_ERROR_CODES,
  RuntimeConfigError,
  describeRuntimeFailure,
  describeRuntimeMode,
  resolveRuntimeConfig,
  type RuntimeConfig,
} from "../src/runtimeConfig";

const PUBLIC_CONFIG = {
  apiKey: "AIzaSyntheticRuntimeKeyForTests0000000000000",
  authDomain: "shiftrelay-hybridai-2026.firebaseapp.com",
  projectId: LIVE_PROJECT_ID,
  messagingSenderId: "1013230596333",
  appId: LIVE_APP_ID,
};

const SITE_KEY = "6LSyntheticSiteKeyForTests000000";

function liveEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    VITE_FIREBASE_LIVE_LOCAL: "1",
    VITE_FIREBASE_API_KEY: PUBLIC_CONFIG.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: PUBLIC_CONFIG.authDomain,
    VITE_FIREBASE_PROJECT_ID: PUBLIC_CONFIG.projectId,
    VITE_FIREBASE_MESSAGING_SENDER_ID: PUBLIC_CONFIG.messagingSenderId,
    VITE_FIREBASE_APPCHECK_SITE_KEY: SITE_KEY,
    VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: "00000000-0000-4000-8000-000000000000",
    ...overrides,
  };
}

function unreachableFetch(): never {
  throw new Error("hosted fetch must not be called in this case");
}

async function resolveLive(overrides: Record<string, string | undefined> = {}): Promise<RuntimeConfig> {
  return resolveRuntimeConfig({
    env: liveEnv(overrides),
    hostname: "127.0.0.1",
    fetchJson: unreachableFetch,
  });
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<RuntimeConfigError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeConfigError);
    const failure = error as RuntimeConfigError;
    expect(failure.code).toBe(code);
    return failure;
  }
  throw new Error(`expected RuntimeConfigError ${code}`);
}

function initJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...PUBLIC_CONFIG, ...overrides };
}

describe("runtime contract mirror", () => {
  it("fixture modes, hosts, project, app, env names and error codes match the code", () => {
    expect(contrato.runtime.modes).toEqual(["emulator", "live-local", "hostedQA"]);
    expect(contrato.runtime.defaultMode).toBe("emulator");
    expect(contrato.runtime.demoProjectId).toBe(DEMO_PROJECT_ID);
    expect(contrato.runtime.liveProjectId).toBe(LIVE_PROJECT_ID);
    expect(contrato.runtime.liveAppId).toBe(LIVE_APP_ID);
    expect(contrato.runtime.localHosts).toEqual([...LOCAL_HOSTS]);
    expect(contrato.runtime.hostedQaHosts).toEqual([...HOSTED_QA_HOSTS]);
    expect(contrato.runtime.hostedInitPath).toBe(HOSTED_INIT_PATH);
    expect(contrato.runtime.liveEnvNames).toEqual([...LIVE_ENV_NAMES]);
    expect(contrato.runtime.errors).toEqual([...RUNTIME_ERROR_CODES]);
    expect(contrato.runtime.appCheck).toEqual({
      emulator: "none",
      "live-local": "debug-token",
      hostedQA: "recaptcha-enterprise",
    });
  });
});

describe("emulator mode (default)", () => {
  it("is the default on both local hosts with no live value and no App Check", async () => {
    for (const hostname of LOCAL_HOSTS) {
      const config = await resolveRuntimeConfig({ env: {}, hostname, fetchJson: unreachableFetch });
      expect(config.mode).toBe("emulator");
      expect(config.appCheck).toEqual({ kind: "none" });
      if (config.mode !== "emulator") {
        throw new Error("mode narrowed");
      }
      expect(config.projectId).toBe(DEMO_PROJECT_ID);
      expect(config.emulatorHost).toBe("127.0.0.1");
    }
  });

  it("keeps the existing local overrides", async () => {
    const config = await resolveRuntimeConfig({
      env: { VITE_EMULATOR_HOST: "localhost" },
      hostname: "localhost",
      fetchJson: unreachableFetch,
    });
    expect(config.mode).toBe("emulator");
    if (config.mode !== "emulator") {
      throw new Error("mode narrowed");
    }
    expect(config.emulatorHost).toBe("localhost");
  });

  it("refuses a non-demo project and a non-local emulator host", async () => {
    await expectCode(
      resolveRuntimeConfig({
        env: { VITE_FIREBASE_PROJECT_ID: LIVE_PROJECT_ID },
        hostname: "localhost",
        fetchJson: unreachableFetch,
      }),
      "wrong_project",
    );
    await expectCode(
      resolveRuntimeConfig({
        env: { VITE_EMULATOR_HOST: "10.0.0.5" },
        hostname: "localhost",
        fetchJson: unreachableFetch,
      }),
      "non_local_emulator",
    );
  });

  it("refuses any origin that is neither local nor an approved Hosting origin", async () => {
    for (const hostname of ["example.com", "shiftrelay-hybridai-2026.web.app.evil.test", ""]) {
      const failure = await expectCode(
        resolveRuntimeConfig({ env: {}, hostname, fetchJson: unreachableFetch }),
        "unknown_origin",
      );
      expect(failure.message).not.toContain("example.com");
    }
  });
});

describe("live-local mode", () => {
  it("uses the exact live project/app and the debug-token App Check plan", async () => {
    const config = await resolveLive();
    expect(config.mode).toBe("live-local");
    if (config.mode !== "live-local") {
      throw new Error("mode narrowed");
    }
    expect(config.firebase).toEqual(PUBLIC_CONFIG);
    expect(config.appCheck).toEqual({
      kind: "debug-token",
      siteKey: SITE_KEY,
      debugToken: "00000000-0000-4000-8000-000000000000",
    });
  });

  it("falls back to the documented public app id when the private file omits it", async () => {
    const config = await resolveLive({ VITE_FIREBASE_APP_ID: undefined });
    expect(config.mode).toBe("live-local");
    if (config.mode !== "live-local") {
      throw new Error("mode narrowed");
    }
    expect(config.firebase.appId).toBe(LIVE_APP_ID);
  });

  it.each(LIVE_ENV_NAMES.filter((name) => name !== "VITE_FIREBASE_APP_ID"))(
    "fails closed when %s is missing or blank",
    async (name) => {
      for (const value of [undefined, "", "   "]) {
        const failure = await expectCode(resolveLive({ [name]: value }), "live_local_incomplete");
        expect(failure.reason).toContain(name);
      }
    },
  );

  it("refuses an API key that is not a Firebase web API key", async () => {
    // Frozen contract §11.1: the live API key must start with `AIza`. The emulator key is a
    // realistic wrong value, and a lowercase prefix must not be accepted either.
    for (const value of [
      "demo-shiftrelay-local-key",
      "aizaSyntheticRuntimeKeyForTests0000000000000",
      "not-a-key",
    ]) {
      const failure = await expectCode(
        resolveLive({ VITE_FIREBASE_API_KEY: value }),
        "live_local_incomplete",
      );
      expect(failure.message).not.toContain(value);
    }
  });

  it("refuses a different project or web app", async () => {
    await expectCode(resolveLive({ VITE_FIREBASE_PROJECT_ID: "other-project" }), "wrong_project");
    await expectCode(resolveLive({ VITE_FIREBASE_APP_ID: "1:1:web:other" }), "wrong_app");
  });

  it("refuses a site key that is not a reCAPTCHA key", async () => {
    await expectCode(resolveLive({ VITE_FIREBASE_APPCHECK_SITE_KEY: "not-a-key" }), "site_key_missing");
  });

  it("never leaks a supplied value in the failure message", async () => {
    const failure = await expectCode(
      resolveLive({ VITE_FIREBASE_PROJECT_ID: "other-project-sentinel" }),
      "wrong_project",
    );
    expect(failure.message).not.toContain("other-project-sentinel");
    expect(describeRuntimeFailure(failure)).not.toContain("other-project-sentinel");
  });
});

describe("hostedQA mode", () => {
  const hostname = HOSTED_QA_HOSTS[0] ?? "";

  it("requires the production site key before it fetches anything", async () => {
    let fetched = 0;
    await expectCode(
      resolveRuntimeConfig({
        env: {},
        hostname,
        fetchJson: async () => {
          fetched += 1;
          return initJson();
        },
      }),
      "site_key_missing",
    );
    expect(fetched).toBe(0);
  });

  it("reads the same-origin init.json and validates the exact project and app", async () => {
    for (const host of HOSTED_QA_HOSTS) {
      const urls: string[] = [];
      const config = await resolveRuntimeConfig({
        env: { VITE_FIREBASE_APPCHECK_SITE_KEY: SITE_KEY },
        hostname: host,
        fetchJson: async (url) => {
          urls.push(url);
          return initJson();
        },
      });
      expect(urls).toEqual([HOSTED_INIT_PATH]);
      expect(config.mode).toBe("hostedQA");
      if (config.mode !== "hostedQA") {
        throw new Error("mode narrowed");
      }
      expect(config.firebase).toEqual(PUBLIC_CONFIG);
      expect(config.appCheck).toEqual({ kind: "recaptcha-enterprise", siteKey: SITE_KEY });
    }
  });

  it("ignores a debug token left in the environment: hosted mode never plans one", async () => {
    const config = await resolveRuntimeConfig({
      env: {
        VITE_FIREBASE_APPCHECK_SITE_KEY: SITE_KEY,
        VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: "00000000-0000-4000-8000-000000000000",
        VITE_FIREBASE_LIVE_LOCAL: "1",
      },
      hostname,
      fetchJson: async () => initJson(),
    });
    expect(config.mode).toBe("hostedQA");
    expect(config.appCheck.kind).toBe("recaptcha-enterprise");
    expect(JSON.stringify(config)).not.toContain("00000000-0000-4000-8000");
  });

  it("fails closed when the endpoint is unavailable or malformed", async () => {
    const fetches: ((url: string) => Promise<unknown>)[] = [
      async () => {
        throw new Error("404");
      },
      async () => "not an object",
      async () => null,
    ];
    for (const fetchJson of fetches) {
      try {
        await resolveRuntimeConfig({
          env: { VITE_FIREBASE_APPCHECK_SITE_KEY: SITE_KEY },
          hostname,
          fetchJson,
        });
        throw new Error("expected a closed failure");
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeConfigError);
        expect(["hosted_config_unavailable", "hosted_config_invalid"]).toContain(
          (error as RuntimeConfigError).code,
        );
      }
    }
  });

  it("fails closed when a required field is missing or a value is wrong", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ apiKey: undefined }, "hosted_config_invalid"],
      [{ appId: "" }, "hosted_config_invalid"],
      [{ projectId: "other-project" }, "wrong_project"],
      [{ appId: "1:1:web:other" }, "wrong_app"],
    ];
    for (const [overrides, code] of cases) {
      await expectCode(
        resolveRuntimeConfig({
          env: { VITE_FIREBASE_APPCHECK_SITE_KEY: SITE_KEY },
          hostname,
          fetchJson: async () => initJson(overrides),
        }),
        code,
      );
    }
  });
});

describe("failure description", () => {
  it("is closed, named and value-free for an unknown error", () => {
    const text = describeRuntimeFailure(new Error("AIzaSyntheticRuntimeKeyForTests0000000000000"));
    expect(text).toContain("No cloud request was made");
    expect(text).not.toContain("AIza");
  });

  it("describes the active mode so the page never claims emulators only in a live mode", () => {
    expect(describeRuntimeMode({ mode: "emulator", projectId: DEMO_PROJECT_ID, emulatorHost: "127.0.0.1", appCheck: { kind: "none" } })).toContain(
      "emulators only",
    );
    expect(
      describeRuntimeMode({
        mode: "live-local",
        firebase: PUBLIC_CONFIG,
        appCheck: { kind: "debug-token", siteKey: SITE_KEY, debugToken: "00000000-0000-4000-8000-000000000000" },
      }),
    ).not.toContain("emulators only");
    expect(
      describeRuntimeMode({
        mode: "hostedQA",
        firebase: PUBLIC_CONFIG,
        appCheck: { kind: "recaptcha-enterprise", siteKey: SITE_KEY },
      }),
    ).toContain("reCAPTCHA Enterprise");
  });
});
