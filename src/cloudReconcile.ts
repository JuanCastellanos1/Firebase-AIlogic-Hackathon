/**
 * Cloud reconciliation adapter (slice 3). One `ONLY_IN_CLOUD` Firebase AI Logic request with
 * the explicit free-tier model `gemini-3.5-flash-lite`; there is no on-device fallback, no
 * retry and no automatic call. The emulator default ships no live cloud configuration, so it
 * reports `notconfigured` and never contacts a cloud endpoint with the demo project. The two live
 * modes require App Check and are wired in `src/firebase.ts`.
 *
 * A page-injected double is accepted only in a development build and only when it labels itself
 * `test-network-mock`; it is a labelled test double, never real cloud evidence, and it is compiled
 * out of production builds. The packet it receives is already the allowlisted shared snapshot, so no
 * private draft can reach even a test double.
 */
import { GoogleAIBackend, InferenceMode, getAI, getGenerativeModel, type SchemaRequest } from "firebase/ai";
import { app, runtimeConfig } from "./firebase";
import { CLOUD_MODEL, CLOUD_SYSTEM_INSTRUCTION } from "./reconciliation";

export const CLOUD_NOT_CONFIGURED =
  "Cloud reconciliation is not configured in this local demo. The preview stays in this tab; nothing is sent. Manual accept/resolve is unchanged.";

/** Structured output is requested from the model; `validateReconcileOutput` still re-checks it. */
const RESPONSE_SCHEMA: SchemaRequest = {
  type: "object",
  properties: {
    brief: { type: "string" },
    suggestions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["duplicate", "contradiction"] },
          taskId: { type: "string" },
          taskVersion: { type: "integer", minimum: 1 },
          targetTaskId: { type: "string" },
          targetVersion: { type: "integer", minimum: 1 },
          rationale: { type: "string" },
        },
        required: ["kind", "taskId", "taskVersion", "targetTaskId", "targetVersion", "rationale"],
      },
    },
  },
  required: ["brief", "suggestions"],
  propertyOrdering: ["brief", "suggestions"],
};

export type CloudProviderLabel = "firebase-ai-logic-only-in-cloud" | "test-network-mock";

export interface CloudProvider {
  readonly status: "ready";
  readonly label: CloudProviderLabel;
  generate(packetText: string, signal?: AbortSignal): Promise<{ readonly text: string }>;
}

export type CloudProviderResolution =
  | CloudProvider
  | { readonly status: "notconfigured"; readonly reason: string };

export class CloudProviderError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`cloud reconciliation failed: ${code}`);
    this.name = "CloudProviderError";
    this.code = code;
  }
}

interface TestCloudDouble {
  readonly kind: "test-network-mock";
  readonly text?: string;
  readonly failWith?: string;
  readonly delayMs?: number;
  readonly received?: string[];
}

function testCloudDouble(): TestCloudDouble | null {
  const candidate = (globalThis as { __shiftrelayTestCloud?: unknown }).__shiftrelayTestCloud;
  return typeof candidate === "object" &&
    candidate !== null &&
    (candidate as { kind?: unknown }).kind === "test-network-mock"
    ? (candidate as TestCloudDouble)
    : null;
}

async function generateFromDouble(
  double: TestCloudDouble,
  packetText: string,
  signal: AbortSignal | undefined,
): Promise<{ readonly text: string }> {
  double.received?.push(packetText);
  if (double.delayMs !== undefined && double.delayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, double.delayMs));
  }
  if (signal?.aborted === true) {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    throw aborted;
  }
  if (typeof double.failWith === "string" && double.failWith !== "") {
    throw new CloudProviderError(double.failWith);
  }
  return { text: double.text ?? "" };
}

/** The real adapter. Only reachable with live cloud configuration; demo builds never call it. */
async function generateInCloud(
  packetText: string,
  signal?: AbortSignal,
): Promise<{ readonly text: string }> {
  const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      systemInstruction: CLOUD_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 2048,
      },
    },
  });
  const result = await model.generateContent(packetText, signal === undefined ? undefined : { signal });
  if (result.response.inferenceSource !== "in_cloud") {
    throw new CloudProviderError("not_in_cloud");
  }
  return { text: result.response.text() };
}

/**
 * Resolution order: a labelled test double (development builds only), then the real adapter in the
 * two live modes, then `notconfigured`. Live cloud needs its own Firebase app and App Check wiring,
 * which only `live-local` and `hostedQA` have; the emulator default never contacts a cloud endpoint.
 */
export function cloudReconciliationProvider(): CloudProviderResolution {
  // Production builds carry no test hook at all: the double is development-only dead code.
  const double = import.meta.env.DEV ? testCloudDouble() : null;
  if (double !== null) {
    return {
      status: "ready",
      label: "test-network-mock",
      generate: (packetText, signal) =>
        generateFromDouble(double, packetText, signal),
    };
  }
  if (runtimeConfig.mode === "emulator") {
    return { status: "notconfigured", reason: CLOUD_NOT_CONFIGURED };
  }
  return { status: "ready", label: "firebase-ai-logic-only-in-cloud", generate: generateInCloud };
}
