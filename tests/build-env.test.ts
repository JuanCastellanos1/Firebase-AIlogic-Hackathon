/**
 * Production-build environment boundary (B2).
 *
 * A real `vite build` runs with the repository's own config into a temporary directory, never into
 * `dist/`. The bundle must contain neither an unrelated `VITE_*` value present at build time nor a
 * live-only value, and the build must refuse before writing output when a live-only value is
 * reachable through `process.env` or a `.env` file.
 */
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG = path.join(ROOT, "vite.config.ts");

// Synthetic and assembled at run time, so no scanner-shaped literal lives in the repository.
const SENTINEL_NAME = "VITE_SHIFTRELAY_UNRELATED_SENTINEL";
const SENTINEL = ["shiftrelay", "unrelated", "sentinel", "7f3c91"].join("-");
const LIVE_ONLY_NAME = "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN";
const LIVE_ONLY_VALUE = ["11111111", "2222", "4333", "8444", "555555555555"].join("-");

async function removeDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

async function temporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `shiftrelay-${prefix}-`));
}

async function buildInto(outDir: string, envDir?: string): Promise<void> {
  await build({
    configFile: CONFIG,
    root: ROOT,
    logLevel: "silent",
    ...(envDir === undefined ? {} : { envDir }),
    build: { outDir },
  });
}

async function readBundle(outDir: string): Promise<string> {
  const chunks: string[] = [];
  for (const relative of await readdir(outDir, { recursive: true })) {
    const file = path.join(outDir, relative);
    if (!(await stat(file)).isFile()) {
      continue;
    }
    chunks.push(await readFile(file, "utf8"));
  }
  return chunks.join("\n");
}

async function buildFailure(outDir: string, envDir?: string): Promise<Error> {
  try {
    await buildInto(outDir, envDir);
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected the build to be refused");
}

describe("production build environment boundary", () => {
  it("does not embed an unrelated VITE_* value in the bundle", async () => {
    process.env[SENTINEL_NAME] = SENTINEL;
    const outDir = await temporaryDirectory("build-sentinel");
    try {
      await buildInto(outDir);
      expect(await readBundle(outDir)).not.toContain(SENTINEL);
    } finally {
      delete process.env[SENTINEL_NAME];
      await removeDirectory(outDir);
    }
  }, 180_000);

  it("refuses a live-only value from process.env without echoing it", async () => {
    process.env[LIVE_ONLY_NAME] = LIVE_ONLY_VALUE;
    const outDir = await temporaryDirectory("build-live-env");
    try {
      const failure = await buildFailure(outDir);
      expect(failure.message).toContain(LIVE_ONLY_NAME);
      expect(failure.message).not.toContain(LIVE_ONLY_VALUE);
    } finally {
      delete process.env[LIVE_ONLY_NAME];
      await removeDirectory(outDir);
    }
  }, 180_000);

  it("refuses a live-only value supplied by a .env file", async () => {
    const envDir = await temporaryDirectory("build-env-file");
    const outDir = await temporaryDirectory("build-env-file-out");
    try {
      await writeFile(path.join(envDir, ".env"), `${LIVE_ONLY_NAME}=${LIVE_ONLY_VALUE}\n`, "utf8");
      const failure = await buildFailure(outDir, envDir);
      expect(failure.message).toContain(LIVE_ONLY_NAME);
      expect(failure.message).not.toContain(LIVE_ONLY_VALUE);
    } finally {
      await removeDirectory(envDir);
      await removeDirectory(outDir);
    }
  }, 180_000);
});
