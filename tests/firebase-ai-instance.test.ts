/**
 * One Firebase AI Logic instance per app, shared by local drafting and cloud reconciliation.
 *
 * `getAI()` caches one instance per app and backend, and it refuses a later call whose
 * `useLimitedUseAppCheckTokens` disagrees with the cached value (`already-initialized`). The real
 * `initializeApp`/`getAI` cache runs here; only `getGenerativeModel` is replaced with a labelled
 * test double, so no network request and no on-device inference can happen. Chrome's
 * `LanguageModel` global is a labelled availability stub for the same reason.
 */
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { AI, GenerativeModel, HybridParams } from "firebase/ai";
import type { RuntimeConfig } from "../src/runtimeConfig";
import contrato from "./fixtures/contrato.json";

const NOTE = "Projector bulb is low. Spare kit is in the office.";
const PACKET = '{"tasks":[],"brief":"nothing shared yet"}';
const CARD_END = NOTE.indexOf("low.") + "low.".length;

const holder = vi.hoisted(() => ({
  apps: [] as FirebaseApp[],
  modelCalls: [] as { readonly mode: string; readonly params: HybridParams }[],
}));

/** Synthetic, unrelated to any real project: the adapter only reads `mode`. */
const LIVE_CONFIG = {
  mode: "live-local",
  firebase: {
    apiKey: "synthetic-test-key",
    authDomain: "synthetic-test.firebaseapp.com",
    projectId: "demo-shiftrelay",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:synthetic",
  },
  appCheck: { kind: "debug-token", siteKey: "synthetic", debugToken: "synthetic" },
} as unknown as RuntimeConfig;

/** Labelled double: the SDK's model class would otherwise reach the network or Chrome. */
function doubleModel(params: HybridParams): GenerativeModel {
  holder.modelCalls.push({ mode: params.mode, params });
  const onDevice = params.mode === "only_on_device";
  return {
    initializeDeviceModel: async (onProgress?: (value: number) => void) => {
      onProgress?.(1);
    },
    generateContent: async () => ({
      response: {
        inferenceSource: onDevice ? "on_device" : "in_cloud",
        text: () =>
          onDevice
            ? JSON.stringify({
                cards: [
                  { title: "Replace projector bulb", detail: "", sourceStart: 0, sourceEnd: CARD_END },
                ],
              })
            : PACKET,
      },
    }),
  } as unknown as GenerativeModel;
}

const LanguageModelStub = {
  availability: async () => "available",
  create: async () => ({ prompt: async () => "", destroy: () => {} }),
};

async function setup(): Promise<{
  local: typeof import("../src/localDraft");
  cloud: typeof import("../src/cloudReconcile");
  app: FirebaseApp;
  getAI: typeof import("firebase/ai").getAI;
  GoogleAIBackend: typeof import("firebase/ai").GoogleAIBackend;
}> {
  vi.resetModules();
  holder.modelCalls.length = 0;
  (globalThis as { LanguageModel?: unknown }).LanguageModel = LanguageModelStub;

  const { initializeApp } = await import("firebase/app");
  const app = initializeApp(
    {
      apiKey: "synthetic-test-key",
      authDomain: "synthetic-test.firebaseapp.com",
      projectId: "demo-shiftrelay",
      appId: "1:000000000000:web:synthetic",
    } satisfies FirebaseOptions,
    `shiftrelay-ai-instance-${randomUUID()}`,
  );
  holder.apps.push(app);

  vi.doMock("../src/firebase", () => ({ app, runtimeConfig: LIVE_CONFIG }));
  vi.doMock("firebase/ai", async (importOriginal) => {
    const actual = await importOriginal<typeof import("firebase/ai")>();
    return {
      ...actual,
      getGenerativeModel: (_ai: AI, params: HybridParams) => doubleModel(params),
    };
  });

  const actualAi = await vi.importActual<typeof import("firebase/ai")>("firebase/ai");
  const local = await import("../src/localDraft");
  const cloud = await import("../src/cloudReconcile");
  return { local, cloud, app, getAI: actualAi.getAI, GoogleAIBackend: actualAi.GoogleAIBackend };
}

function cachedLimitedUseTokens(
  app: FirebaseApp,
  getAI: typeof import("firebase/ai").getAI,
  GoogleAIBackend: typeof import("firebase/ai").GoogleAIBackend,
): boolean | undefined {
  // No options: this only reads the instance cached by the feature code under test.
  return getAI(app, { backend: new GoogleAIBackend() }).options?.useLimitedUseAppCheckTokens;
}

/** Fails the test with the SDK error instead of an opaque `rejects` diff. */
async function settle(run: () => Promise<unknown>): Promise<unknown> {
  return run();
}

afterEach(async () => {
  vi.doUnmock("../src/firebase");
  vi.doUnmock("firebase/ai");
  delete (globalThis as { LanguageModel?: unknown }).LanguageModel;
  const { deleteApp } = await vi.importActual<typeof import("firebase/app")>("firebase/app");
  for (const app of holder.apps.splice(0)) {
    await deleteApp(app);
  }
  vi.resetModules();
});

describe("Firebase AI instance sharing", () => {
  it("drafts locally and then reconciles in cloud without already-initialized", async () => {
    const { local, cloud, app, getAI, GoogleAIBackend } = await setup();

    await settle(() => local.initializeLocalDraft(() => {}));
    await settle(() => local.generateLocalDraft(NOTE));

    const provider = cloud.cloudReconciliationProvider();
    expect(provider.status).toBe("ready");
    const text = await settle(() =>
      provider.status === "ready" ? provider.generate(PACKET) : Promise.reject(provider.reason),
    );
    expect(text).toEqual({ text: PACKET });

    const { InferenceMode } = await vi.importActual<typeof import("firebase/ai")>("firebase/ai");
    const modes = holder.modelCalls.map((call) => call.mode);
    expect(modes).toEqual([InferenceMode.ONLY_ON_DEVICE, InferenceMode.ONLY_ON_DEVICE, InferenceMode.ONLY_IN_CLOUD]);
    expect(holder.modelCalls[0]?.params).not.toHaveProperty("inCloudParams");
    expect(holder.modelCalls[2]?.params).not.toHaveProperty("onDeviceParams");

    // The captured params are what the SDK would put on the cloud request: the frozen model id,
    // the JSON response mode, the 2048-token output cap and the reconciliation response schema.
    const cloudParams = holder.modelCalls[2]?.params.inCloudParams;
    expect(cloudParams?.model).toBe(contrato.reconciliation.model);
    expect(cloudParams?.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
    });
    expect(cloudParams?.generationConfig?.responseSchema).toMatchObject({
      type: "object",
      required: ["brief", "suggestions"],
    });

    expect(cachedLimitedUseTokens(app, getAI, GoogleAIBackend)).toBe(true);
  });

  it("reconciles in cloud first and then drafts locally without already-initialized", async () => {
    const { local, cloud, app, getAI, GoogleAIBackend } = await setup();

    const provider = cloud.cloudReconciliationProvider();
    expect(provider.status).toBe("ready");
    await settle(() =>
      provider.status === "ready" ? provider.generate(PACKET) : Promise.reject(provider.reason),
    );

    await settle(() => local.generateLocalDraft(NOTE));

    const { InferenceMode } = await vi.importActual<typeof import("firebase/ai")>("firebase/ai");
    expect(holder.modelCalls.map((call) => call.mode)).toEqual([
      InferenceMode.ONLY_IN_CLOUD,
      InferenceMode.ONLY_ON_DEVICE,
    ]);

    expect(cachedLimitedUseTokens(app, getAI, GoogleAIBackend)).toBe(true);
  });
});
