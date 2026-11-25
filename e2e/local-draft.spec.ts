import { expect, test, type Browser, type Page } from "@playwright/test";
import { createUser, listHandovers, signIn, type EmulatorSession } from "./support";

/**
 * Browser capability is mocked in these tests only: Playwright's Chromium does not expose
 * Chrome's Prompt API. Every request still goes through the real Firebase AI Logic SDK and
 * its ONLY_ON_DEVICE adapter, which calls the mocked local model. The genuine Chrome 157
 * download and ON_DEVICE request are separate manual evidence, not these tests.
 */
type LocalMode = "available" | "downloadable" | "download-error" | "unavailable" | "bad-json";

interface LocalOptions {
  readonly mode: LocalMode;
  readonly promptDelayMs?: number;
}

const NOTE = "Projector bulb is low; spare kit is in the office.";
const MOCK_TITLE = "Replace projector bulb";

async function addLocalModel(page: Page, options: LocalOptions): Promise<void> {
  await page.addInitScript(({ mode, promptDelayMs }) => {
    interface MockSession {
      prompt(input: unknown, promptOptions?: { responseConstraint?: object }): Promise<string>;
      destroy(): void;
    }
    interface MockMonitor {
      addEventListener(type: string, listener: (event: { loaded: number }) => void): void;
    }
    interface MockCreateOptions {
      monitor?: (monitor: MockMonitor) => void;
    }
    const state = { mode, prompts: 0, creates: 0 };
    (globalThis as { __localModelMock?: typeof state }).__localModelMock = state;

    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const delayMs = promptDelayMs ?? 0;
    const session: MockSession = {
      async prompt(_input, _promptOptions) {
        state.prompts += 1;
        if (delayMs > 0) {
          await wait(delayMs);
        }
        return mode === "bad-json"
          ? "I cannot help with that request."
          : JSON.stringify({
              cards: [
                {
                  title: "Replace projector bulb",
                  detail: "Spare kit is in the office.",
                  sourceStart: 0,
                  sourceEnd: 23,
                },
              ],
            });
      },
      destroy() {},
    };

    const api = {
      async availability() {
        if (mode === "unavailable") {
          return "unavailable";
        }
        if (mode === "downloadable") {
          return state.creates === 0 ? "downloadable" : "available";
        }
        if (mode === "download-error") {
          return "downloadable";
        }
        return "available";
      },
      async create(createOptions?: MockCreateOptions) {
        state.creates += 1;
        if (mode === "download-error") {
          throw new Error("synthetic local download failure");
        }
        createOptions?.monitor?.({
          addEventListener: (_type, listener) => {
            listener({ loaded: 0.5 });
          },
        });
        if (mode === "downloadable") {
          await wait(700);
        }
        return session;
      },
    };
    Object.defineProperty(globalThis, "LanguageModel", { value: api, configurable: true });
  }, options);
}

async function openLocalSession(
  browser: Browser,
  label: string,
  options: LocalOptions,
): Promise<EmulatorSession> {
  const user = await createUser(label, "outgoing");
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
  const page = await context.newPage();
  await addLocalModel(page, options);
  await signIn(page, user);
  return { ...user, context, page };
}

function externalRequests(urls: readonly string[]): string[] {
  return urls.filter(
    (url) => !/^http:\/\/(127\.0\.0\.1|localhost):(5173|8080|9099)\//.test(url),
  );
}

test.describe("strictly local private drafting", () => {
  test("available model drafts through ON_DEVICE and only explicit acceptance changes cards", async ({
    browser,
  }) => {
    const session = await openLocalSession(browser, "local-ready", { mode: "available" });
    const { page } = session;
    const sentinel = `LOCAL-PRIVATE-${Date.now()}`;
    const requests: string[] = [];
    const consoleText: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message) => consoleText.push(message.text()));
    page.on("pageerror", (error) => consoleText.push(error.message));
    const handoversBefore = (await listHandovers()).length;

    await page.getByLabel("Private shift note (not shared)").fill(`${sentinel} ${NOTE}`);
    await page.getByRole("button", { name: "Draft cards with on-device model" }).click();
    await expect(page.getByRole("heading", { name: "Local suggestions (not shared)" })).toBeVisible();
    await expect(page.getByText(/^Generated on this device \(ON_DEVICE\)\. None of this is shared/)).toBeVisible();

    // Suggestions are a separate, non-authoritative step: the editable card is untouched.
    await expect(page.getByLabel("Card 1 title")).toHaveValue("");
    await expect(page.getByLabel("Card 1 detail")).toHaveValue("");
    expect(await listHandovers()).toHaveLength(handoversBefore);
    expect(externalRequests(requests)).toEqual([]);
    expect(await page.evaluate(
      () => (globalThis as { __localModelMock?: { prompts: number } }).__localModelMock?.prompts ?? 0,
    )).toBe(1);

    await page.getByRole("button", { name: "Use these suggestions" }).click();
    await expect(page.getByRole("heading", { name: "Local suggestions (not shared)" })).toHaveCount(0);
    await expect(page.getByLabel("Card 1 title")).toHaveValue(MOCK_TITLE);
    await expect(page.getByLabel("Card 1 detail")).toHaveValue("Spare kit is in the office.");
    // Review and share remain separate, explicit steps.
    await page.getByRole("button", { name: "Review cards" }).click();
    await expect(page.getByRole("heading", { name: "Review exact shared fields" })).toBeVisible();

    const storage = await page.evaluate(() =>
      `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)} ${location.href}`,
    );
    expect(storage).not.toContain(sentinel);
    expect(consoleText.join("\n")).not.toContain(sentinel);
    expect(requests.join("\n")).not.toContain(sentinel);
    expect(JSON.stringify(await listHandovers())).not.toContain(sentinel);
    await session.context.close();
  });

  test("downloadable model needs a click and reports progress before drafting", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-download", { mode: "downloadable" });
    const { page } = session;
    await expect(page.getByText(/on-device model is downloadable/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft cards with on-device model" })).toHaveCount(0);

    await page.getByRole("button", { name: "Enable on-device drafting" }).click();
    await expect(page.getByText("Downloading on-device model… 50%")).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft cards with on-device model" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Private shift note (not shared)")).toHaveValue("");
    await session.context.close();
  });

  test("download failure keeps the note and the manual workflow usable", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-error", { mode: "download-error" });
    const { page } = session;
    const sentinel = `LOCAL-DOWNLOAD-FAIL-${Date.now()}`;
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.getByLabel("Private shift note (not shared)").fill(`Manual fallback ${sentinel}`);
    await page.getByRole("button", { name: "Enable on-device drafting" }).click();
    await expect(page.getByRole("alert")).toContainText(/could not be enabled/i);
    await expect(page.getByLabel("Private shift note (not shared)")).toHaveValue(
      `Manual fallback ${sentinel}`,
    );
    expect(externalRequests(requests)).toEqual([]);

    const title = `Manual after local failure ${Date.now()}`;
    await page.getByLabel("Card 1 title").fill(title);
    await page.getByRole("button", { name: "Review cards" }).click();
    await page.getByRole("button", { name: "Share handover" }).click();
    await expect(page.getByText(/Server confirmed 1 open task/)).toBeVisible();
    await session.context.close();
  });

  test("unavailable model shows a distinct state and keeps manual entry", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-unavailable", { mode: "unavailable" });
    const { page } = session;
    await expect(page.getByText(/On-device drafting is not available in this browser/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Enable on-device drafting" })).toHaveCount(0);
    await page.getByLabel("Private shift note (not shared)").fill("Manual note without a local model.");
    await page.getByLabel("Card 1 title").fill("Manual task");
    await page.getByRole("button", { name: "Review cards" }).click();
    await expect(page.getByRole("heading", { name: "Review exact shared fields" })).toBeVisible();
    await session.context.close();
  });

  test("unusable model output is rejected without touching the note or cards", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-bad-output", { mode: "bad-json" });
    const { page } = session;
    const note = "Keep this note exactly as typed.";
    await page.getByLabel("Private shift note (not shared)").fill(note);
    await page.getByRole("button", { name: "Draft cards with on-device model" }).click();
    await expect(page.getByRole("alert")).toContainText(/did not return a usable draft/i);
    await expect(page.getByLabel("Private shift note (not shared)")).toHaveValue(note);
    await expect(page.getByLabel("Card 1 title")).toHaveValue("");
    await expect(page.getByRole("heading", { name: "Local suggestions (not shared)" })).toHaveCount(0);
    await session.context.close();
  });

  test("editing the note cancels an in-flight local draft", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-edit", {
      mode: "available",
      promptDelayMs: 1500,
    });
    const { page } = session;
    await page.getByLabel("Private shift note (not shared)").fill("First private note");
    await page.getByRole("button", { name: "Draft cards with on-device model" }).click();
    await expect(page.getByRole("button", { name: "Cancel local drafting" })).toBeVisible();
    await page.getByLabel("Private shift note (not shared)").fill("Second, edited note");
    await expect(page.getByText(/in-flight local draft was canceled/i)).toBeVisible();
    await page.waitForTimeout(1800);
    await expect(page.getByRole("heading", { name: "Local suggestions (not shared)" })).toHaveCount(0);
    await expect(page.getByLabel("Private shift note (not shared)")).toHaveValue("Second, edited note");
    await expect(page.getByLabel("Card 1 title")).toHaveValue("");
    await session.context.close();
  });

  test("a late local result cannot repopulate a signed-out page", async ({ browser }) => {
    const session = await openLocalSession(browser, "local-late", {
      mode: "available",
      promptDelayMs: 2000,
    });
    const { page } = session;
    const sentinel = `LOCAL-LATE-${Date.now()}`;
    await page.getByLabel("Private shift note (not shared)").fill(`${sentinel} after sign-out`);
    await page.getByRole("button", { name: "Draft cards with on-device model" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(sentinel);
    await expect(page.locator("body")).not.toContainText(MOCK_TITLE);
    await page.waitForTimeout(2400);
    await expect(page.locator("body")).not.toContainText(sentinel);
    await expect(page.locator("body")).not.toContainText(MOCK_TITLE);
    await session.context.close();
  });
});
