/**
 * Runtime-mode guard for the default local build: the page must resolve to the emulator mode, with
 * no App Check, no live config fetch and no cloud host contacted on load.
 *
 * If a `live-local` dev server is ever reused by the Playwright web server, this test fails on the
 * debug-token global instead of silently talking to the live project.
 */
import { expect, test } from "@playwright/test";

const CLOUD_HOSTS = [
  "firebasevertexai.googleapis.com",
  "content-firebaseappcheck.googleapis.com",
  "recaptchaenterprise.googleapis.com",
  "www.google.com",
];

test("the default build is the emulator mode with no App Check and no live config fetch", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  const debugToken = await page.evaluate(
    () => (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown }).FIREBASE_APPCHECK_DEBUG_TOKEN,
  );
  expect(debugToken).toBeUndefined();

  expect(urls.some((url) => url.includes("/__/firebase/init.json"))).toBe(false);
  for (const url of urls) {
    for (const host of CLOUD_HOSTS) {
      expect(url).not.toContain(host);
    }
  }
});
