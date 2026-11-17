import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openSession, waitForHandover } from "./support";

async function expectNoSeriousViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, `${label}: ${JSON.stringify(serious.map((entry) => entry.id))}`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label} overflows horizontally`).toBeLessThanOrEqual(0);
}

test.describe("accessible manual workflow", () => {
  test("320px layout, keyboard path, focus restoration and axe serious/critical scan", async ({ browser }) => {
    const anon = await browser.newContext({ baseURL: "http://127.0.0.1:5173", viewport: { width: 320, height: 800 } });
    const anonPage = await anon.newPage();
    await anonPage.goto("/");
    await expect(anonPage.getByRole("heading", { name: /Close the shift/ })).toBeVisible();
    await expectNoHorizontalOverflow(anonPage, "sign-in at 320px");
    await expectNoSeriousViolations(anonPage, "sign-in");
    await anon.close();

    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const page = outgoing.page;
    await page.setViewportSize({ width: 320, height: 800 });

    // Real keyboard sign-in: no mouse interaction.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Email").focus();
    await page.keyboard.type(outgoing.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(outgoing.password);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Shift handover" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Local drafting (optional)" })).toBeVisible();
    await expectNoSeriousViolations(page, "outgoing draft with local model state");

    await page.getByLabel("Private shift note (not shared)").focus();
    await page.keyboard.type("Keyboard-only private note.");
    await expect(page.getByText("Checking this device's local model…")).toHaveCount(0);
    await page.keyboard.press("Tab");
    const enableLocal = page.getByRole("button", { name: "Enable on-device drafting" });
    if ((await enableLocal.count()) === 1) {
      await expect(enableLocal).toBeFocused();
      await page.keyboard.press("Tab");
    }
    await expect(page.getByLabel("Card 1 title")).toBeFocused();
    const keyboardTitle = `Keyboard task ${Date.now()}`;
    await page.keyboard.type(keyboardTitle);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Typed with the keyboard.");
    await page.getByRole("button", { name: "Review cards" }).focus();
    await expect(page.getByRole("button", { name: "Review cards" })).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Review exact shared fields" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "outgoing workspace at 320px");
    await expectNoSeriousViolations(page, "outgoing review");
    await page.getByRole("button", { name: "Share handover" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Server confirmed 1 open task/)).toBeVisible();
    await waitForHandover(outgoing.uid, keyboardTitle);

    const incoming = await openSession(browser, "incoming", "incoming");
    const incomingPage = incoming.page;
    await incomingPage.setViewportSize({ width: 320, height: 800 });
    await incomingPage.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(incomingPage.getByRole("heading", { name: keyboardTitle, exact: true })).toBeVisible();
    const acceptName = `Accept task: ${keyboardTitle}`;
    await incomingPage.getByRole("button", { name: acceptName }).focus();
    await incomingPage.keyboard.press("Enter");
    await expect(incomingPage.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    await expectNoHorizontalOverflow(incomingPage, "incoming workspace at 320px");
    await expectNoSeriousViolations(incomingPage, "incoming task list");

    const resolveName = `Resolve task: ${keyboardTitle}`;
    await incomingPage.getByRole("button", { name: resolveName }).focus();
    await incomingPage.keyboard.press("Enter");
    await expect(incomingPage.getByLabel("Resolution")).toBeVisible();
    await expectNoSeriousViolations(incomingPage, "resolve form");
    await incomingPage.getByRole("button", { name: "Cancel" }).focus();
    await incomingPage.keyboard.press("Enter");
    await expect(incomingPage.getByRole("button", { name: resolveName })).toBeFocused();

    await incomingPage.getByRole("button", { name: resolveName }).focus();
    await incomingPage.keyboard.press("Enter");
    await incomingPage.getByLabel("Resolution").fill("Closed by keyboard.");
    await incomingPage.getByRole("button", { name: "Confirm resolution" }).focus();
    await incomingPage.keyboard.press("Enter");
    await expect(incomingPage.getByText(/Resolved\. The server recorded the resolution/)).toBeVisible();
    await expectNoSeriousViolations(incomingPage, "resolved task");
  });
});
