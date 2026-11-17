import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  createUser,
  integerField,
  openSession,
  publishCardsViaUi,
  readActivity,
  readTask,
  resetDocuments,
  seedPublishedTasks,
  signIn,
  waitForHandover,
  type EmulatorSession,
} from "./support";

/**
 * Cloud reconciliation suites. The local demo build has no live cloud configuration, so the
 * only cloud call here is a page-injected double that labels itself `test-network-mock` and is
 * visibly marked in the UI. It is not real cloud evidence; the live ONLY_IN_CLOUD request and
 * App Check remain open (docs/verification.md).
 */

interface TestDouble {
  readonly kind: string;
  text: string;
  failWith: string | null;
  delayMs: number;
  received: string[];
}

async function installCloudDouble(page: Page, delayMs = 0): Promise<void> {
  await page.addInitScript((delay: number) => {
    (globalThis as unknown as { __shiftrelayTestCloud: unknown }).__shiftrelayTestCloud = {
      kind: "test-network-mock",
      text: "",
      failWith: null,
      delayMs: delay,
      received: [],
    };
  }, delayMs);
}

async function cloudDouble(page: Page): Promise<TestDouble> {
  return page.evaluate(
    () => (globalThis as unknown as { __shiftrelayTestCloud: TestDouble }).__shiftrelayTestCloud,
  );
}

async function setCloudText(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    (globalThis as unknown as { __shiftrelayTestCloud: { text: string } }).__shiftrelayTestCloud.text =
      value;
  }, text);
}

async function setCloudFailure(page: Page, failure: string | null): Promise<void> {
  await page.evaluate((value) => {
    (
      globalThis as unknown as { __shiftrelayTestCloud: { failWith: string | null } }
    ).__shiftrelayTestCloud.failWith = value;
  }, failure);
}

async function openCloudSession(
  browser: Browser,
  label: string,
  role: "outgoing" | "incoming",
  delayMs = 0,
): Promise<EmulatorSession> {
  const user = await createUser(label, role);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
  const page = await context.newPage();
  await installCloudDouble(page, delayMs);
  await signIn(page, user);
  return { ...user, context, page };
}

interface PacketShape {
  readonly sources: { id: string; version: number; title: string; detail: string; state: string }[];
  readonly context: { id: string; version: number; title: string; detail: string; state: string }[];
}

async function readPacket(page: Page): Promise<{ text: string; packet: PacketShape }> {
  const text = await page.getByTestId("cloud-packet").innerText();
  return { text, packet: JSON.parse(text) as PacketShape };
}

async function selectSource(page: Page, title: string): Promise<void> {
  await sourceBox(page, title).check();
}

async function preview(page: Page): Promise<{ text: string; packet: PacketShape }> {
  await page.getByRole("button", { name: "Preview exact cloud packet" }).click();
  await expect(page.getByRole("heading", { name: "Exact outgoing packet (not sent yet)" })).toBeVisible();
  return readPacket(page);
}

async function approveAndSend(page: Page): Promise<void> {
  await page.getByLabel("I approve exactly this packet and one cloud request").check();
  await page.getByRole("button", { name: "Send one cloud request" }).click();
}

function externalRequests(urls: readonly string[]): string[] {
  return urls.filter((url) => !/^http:\/\/(127\.0\.0\.1|localhost):(5173|8080|9099)\//.test(url));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceBox(page: Page, title: string) {
  return page.getByLabel(new RegExp(`^Include ${escapeRegExp(title)} as a source task`));
}

async function expectNoSeriousViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".reconciliation-panel").analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, `${label}: ${JSON.stringify(serious.map((entry) => entry.id))}`).toEqual([]);
}

test.describe("separately consented cloud reconciliation", () => {
  // Each case starts from an empty venue so the context bound is deterministic; Auth accounts
  // are created per case and memberships are written after this reset.
  test.beforeEach(async () => {
    await resetDocuments();
  });

  test("the local demo is not configured, previews locally and never contacts a cloud endpoint", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "recon-unconfigured");
    const { page } = outgoing;
    const sentinel = `RECON-PRIVATE-${Date.now()}`;
    const title = `Unconfigured source ${Date.now()}`;
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await publishCardsViaUi(page, `Private note ${sentinel}`, [
      { title, detail: "Shared detail only." },
      { title: `${title} other`, detail: "" },
    ]);
    await waitForHandover(outgoing.uid, title);

    await expect(page.getByText(/Cloud reconciliation is not configured in this local demo/)).toBeVisible();
    await selectSource(page, title);
    const { text } = await preview(page);
    expect(text).toContain(title);
    expect(text).not.toContain(sentinel);
    expect(text).not.toContain('"ownerId"');
    expect(text).not.toContain('"resolution"');
    expect(text).not.toContain('"creatorId"');

    await expect(page.getByLabel("I approve exactly this packet and one cloud request")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Send one cloud request" })).toHaveCount(0);
    await expect(page.getByText(/Sending is unavailable in this build/)).toBeVisible();
    expect(externalRequests(requests)).toEqual([]);

    await page.setViewportSize({ width: 320, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectNoSeriousViolations(page, "unconfigured preview at 320px");
    await outgoing.context.close();
  });

  test("more than twenty eligible tasks require a visible context selection", async ({ browser }) => {
    const tag = `${Date.now()}`;
    const titles = Array.from({ length: 22 }, (_, index) => `Seeded ${tag} ${String(index + 1).padStart(2, "0")}`);
    await seedPublishedTasks(tag, titles.map((title) => ({ title, detail: "" })));

    const incoming = await openCloudSession(browser, "recon-many", "incoming");
    const { page } = incoming;
    await selectSource(page, titles[0] as string);
    await expect(page.getByText(/other open or accepted tasks exist, more than the 20/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview exact cloud packet" })).toBeDisabled();

    const contextBoxes = page.getByRole("checkbox", { name: /as context \(/ });
    expect(await contextBoxes.count()).toBeGreaterThanOrEqual(20);
    for (let index = 0; index < 20; index += 1) {
      await contextBoxes.nth(index).check();
    }
    await expect(page.getByText("Context tasks (20 of 20 chosen)")).toBeVisible();

    const { packet } = await preview(page);
    expect(packet.sources).toHaveLength(1);
    expect(packet.context).toHaveLength(20);
    expect(packet.context.map((entry) => entry.id)).not.toContain(packet.sources[0]?.id);
    await expect(page.getByText(/20 eligible context tasks visible in this preview/)).toBeVisible();
    await incoming.context.close();
  });

  test("one approved packet yields one confirmed observation and a dismissal writes nothing", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "recon-source");
    const { page: outgoingPage } = outgoing;
    const sentinel = `RECON-CONFIRM-PRIVATE-${Date.now()}`;
    const title = `Projector duplicate ${Date.now()}`;
    await publishCardsViaUi(outgoingPage, `Private ${sentinel}`, [
      { title, detail: "Replace the projector bulb." },
      { title: `${title} spare`, detail: "Spare bulb is in the office." },
    ]);
    await waitForHandover(outgoing.uid, title);

    const incoming = await openCloudSession(browser, "recon-confirm", "incoming");
    const page = incoming.page;
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(page.getByText("TEST MOCK - not a real cloud request.")).toBeVisible();

    await selectSource(page, title);
    const previewed = await preview(page);
    const source = previewed.packet.sources[0];
    const target = previewed.packet.context[0];
    expect(source).toBeDefined();
    expect(target).toBeDefined();
    expect(previewed.text).not.toContain(sentinel);
    expect((await cloudDouble(page)).received).toEqual([]);

    const response = JSON.stringify({
      brief: "Two cards describe the same bulb.",
      suggestions: [
        {
          kind: "duplicate",
          taskId: source!.id,
          taskVersion: source!.version,
          targetTaskId: target!.id,
          targetVersion: target!.version,
          rationale: "Both cards refer to the same failing projector bulb.",
        },
        {
          kind: "contradiction",
          taskId: source!.id,
          taskVersion: source!.version,
          targetTaskId: target!.id,
          targetVersion: target!.version,
          rationale: "One card says replace, the other says spare is available.",
        },
      ],
    });
    await setCloudText(page, response);
    await approveAndSend(page);
    await expect(page.getByRole("heading", { name: "Model suggestions (nothing written)" })).toBeVisible();
    await expect(page.getByText("Two cards describe the same bulb.")).toBeVisible();

    const sent = await cloudDouble(page);
    expect(sent.received).toHaveLength(1);
    expect(sent.received[0]).toBe(previewed.text);
    expect(externalRequests(requests)).toEqual([]);

    await page.getByRole("button", { name: "Dismiss suggestion" }).nth(1).click();
    await expect(page.getByText("Suggestion dismissed. Nothing was written.")).toBeVisible();
    expect(integerField(await readTask(source!.id), "version")).toBe(1);
    expect(await readActivity(source!.id, 2)).toBeNull();

    await page.getByRole("button", { name: `Confirm observation for ${title}`, exact: true }).click();
    await expect(page.getByText(/Observation recorded at the next source version/)).toBeVisible();
    expect(integerField(await readTask(source!.id), "version")).toBe(2);
    expect(integerField(await readTask(target!.id), "version")).toBe(target!.version);
    const observation = JSON.stringify(await readActivity(source!.id, 2));
    expect(observation).toContain("duplicate");
    expect(observation).toContain(source!.id);
    expect(observation).toContain(target!.id);
    expect(await readActivity(target!.id, target!.version + 1)).toBeNull();

    await page.getByRole("button", { name: "Refresh shared tasks" }).click();
    const sourceCard = page
      .locator("article.task")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await sourceCard.getByText(/^History/).click();
    await expect(sourceCard.getByText(/Observation \(duplicate\) of/)).toBeVisible();
    await expect(
      sourceCard.getByText(/Both cards refer to the same failing projector bulb/),
    ).toBeVisible();
    await incoming.context.close();
    await outgoing.context.close();
  });

  test("a stale target rejects confirmation and writes no observation", async ({ browser }) => {
    const outgoing = await openSession(browser, "outgoing", "recon-stale-source");
    const { page: outgoingPage } = outgoing;
    const title = `Stale source ${Date.now()}`;
    await publishCardsViaUi(outgoingPage, "Private note", [
      { title, detail: "" },
      { title: `${title} other`, detail: "" },
    ]);
    await waitForHandover(outgoing.uid, title);

    const first = await openCloudSession(browser, "recon-stale-first", "incoming");
    const second = await openCloudSession(browser, "recon-stale-second", "incoming");
    for (const session of [first, second]) {
      await session.page.getByRole("button", { name: "Refresh shared tasks" }).click();
      await expect(session.page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }

    await selectSource(first.page, title);
    const previewed = await preview(first.page);
    const source = previewed.packet.sources[0];
    const target = previewed.packet.context[0];
    expect(source).toBeDefined();
    expect(target).toBeDefined();
    await setCloudText(
      first.page,
      JSON.stringify({
        brief: "Stale comparison.",
        suggestions: [
          {
            kind: "duplicate",
            taskId: source!.id,
            taskVersion: source!.version,
            targetTaskId: target!.id,
            targetVersion: target!.version,
            rationale: "Same work item.",
          },
        ],
      }),
    );
    await approveAndSend(first.page);
    await expect(first.page.getByRole("heading", { name: "Model suggestions (nothing written)" })).toBeVisible();

    const targetTitle = target!.title;
    await second.page.getByRole("button", { name: `Accept task: ${targetTitle}`, exact: true }).click();
    await expect(second.page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    expect(integerField(await readTask(target!.id), "version")).toBe(target!.version + 1);

    await first.page.getByRole("button", { name: `Confirm observation for ${title}`, exact: true }).click();
    await expect(first.page.getByText(/Conflict: the shared tasks changed since this suggestion/)).toBeVisible();
    expect(integerField(await readTask(source!.id), "version")).toBe(1);
    expect(await readActivity(source!.id, 2)).toBeNull();

    // The same stale check applies to a changed source task.
    await first.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    const refreshed = await preview(first.page);
    const refreshedSource = refreshed.packet.sources[0];
    const refreshedTarget = refreshed.packet.context[0];
    expect(refreshedSource?.version).toBe(1);
    expect(refreshedTarget?.version).toBe(target!.version + 1);
    await setCloudText(
      first.page,
      JSON.stringify({
        brief: "Second comparison.",
        suggestions: [
          {
            kind: "contradiction",
            taskId: refreshedSource!.id,
            taskVersion: refreshedSource!.version,
            targetTaskId: refreshedTarget!.id,
            targetVersion: refreshedTarget!.version,
            rationale: "Still worth a decision.",
          },
        ],
      }),
    );
    await approveAndSend(first.page);
    await expect(first.page.getByRole("heading", { name: "Model suggestions (nothing written)" })).toBeVisible();
    await second.page.getByRole("button", { name: `Accept task: ${title}`, exact: true }).click();
    await expect(second.page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    await first.page.getByRole("button", { name: `Confirm observation for ${title}`, exact: true }).click();
    await expect(first.page.getByText(/Conflict: the shared tasks changed since this suggestion/)).toBeVisible();
    const sourceAfterAccept = JSON.stringify(await readActivity(source!.id, 2));
    expect(sourceAfterAccept).toContain("accept");
    expect(sourceAfterAccept).not.toContain("contradiction");
    await first.context.close();
    await second.context.close();
    await outgoing.context.close();
  });

  test("one request in flight, cancel and sign-out discard late results without a retry", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "recon-late-source");
    const title = `Late source ${Date.now()}`;
    await publishCardsViaUi(outgoing.page, "Private note", [
      { title, detail: "" },
      { title: `${title} other`, detail: "" },
    ]);
    await waitForHandover(outgoing.uid, title);

    const incoming = await openCloudSession(browser, "recon-late", "incoming", 1200);
    const page = incoming.page;
    await page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await setCloudText(page, JSON.stringify({ brief: "LATE-BRIEF-MARKER", suggestions: [] }));

    await selectSource(page, title);
    await preview(page);
    expect((await cloudDouble(page)).received).toEqual([]);

    // Editing the selection after preview drops the exact packet and approval.
    await sourceBox(page, title).uncheck();
    await expect(page.getByRole("heading", { name: "Exact outgoing packet (not sent yet)" })).toHaveCount(0);

    await selectSource(page, title);
    await preview(page);
    expect((await cloudDouble(page)).received).toEqual([]);
    await approveAndSend(page);
    await expect(page.getByRole("button", { name: "Cancel request" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Waiting for the cloud model..." })).toBeDisabled();
    await page.getByRole("button", { name: "Cancel request" }).click();
    await expect(page.getByText(/Request canceled\. Nothing was written and no retry was sent/)).toBeVisible();
    expect((await cloudDouble(page)).received).toHaveLength(1);
    await page.waitForTimeout(1500);
    await expect(page.getByRole("heading", { name: "Model suggestions (nothing written)" })).toHaveCount(0);
    await expect(page.getByText("LATE-BRIEF-MARKER")).toHaveCount(0);
    expect((await cloudDouble(page)).received).toHaveLength(1);

    // A late result after sign-out cannot repopulate the page.
    await preview(page);
    await approveAndSend(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.waitForTimeout(1600);
    await expect(page.getByText("LATE-BRIEF-MARKER")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Model suggestions");
    await incoming.context.close();
    await outgoing.context.close();
  });

  test("quota, offline, auth and invalid responses never write and keep the manual path", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "recon-fail-source");
    const title = `Failure source ${Date.now()}`;
    await publishCardsViaUi(outgoing.page, "Private note", [
      { title, detail: "" },
      { title: `${title} other`, detail: "" },
    ]);
    await waitForHandover(outgoing.uid, title);

    const incoming = await openCloudSession(browser, "recon-fail", "incoming");
    const page = incoming.page;
    await page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await selectSource(page, title);
    const previewed = await preview(page);
    const source = previewed.packet.sources[0];
    const target = previewed.packet.context[0];
    expect(source).toBeDefined();
    expect(target).toBeDefined();

    await setCloudText(
      page,
      JSON.stringify({
        brief: "",
        suggestions: [],
        ownerId: "forged-owner",
      }),
    );
    await approveAndSend(page);
    await expect(page.getByText(/cannot accept, so it was rejected/)).toBeVisible();

    await setCloudText(page, "x".repeat(12_001));
    await approveAndSend(page);
    await expect(page.getByText(/more than 12,000 bytes/)).toBeVisible();

    await setCloudText(page, "I cannot help with that.");
    await approveAndSend(page);
    await expect(page.getByText(/did not return the expected JSON/)).toBeVisible();

    await setCloudFailure(page, "quota");
    await approveAndSend(page);
    await expect(page.getByText(/Cloud quota is exhausted right now/)).toBeVisible();

    await setCloudFailure(page, "offline");
    await approveAndSend(page);
    await expect(page.getByText(/unreachable or offline/)).toBeVisible();

    await setCloudFailure(page, "auth");
    await approveAndSend(page);
    await expect(page.getByText(/not authorized for the cloud model/)).toBeVisible();

    expect(integerField(await readTask(source!.id), "version")).toBe(1);
    expect(await readActivity(source!.id, 2)).toBeNull();

    await setCloudFailure(page, null);
    await page.getByRole("button", { name: `Accept task: ${title}`, exact: true }).click();
    await expect(page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    const accepted = await readTask(source!.id);
    expect(integerField(accepted, "version")).toBe(2);
    expect(JSON.stringify(await readActivity(source!.id, 2))).toContain("accept");
    await incoming.context.close();
    await outgoing.context.close();
  });
});
