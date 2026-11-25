/**
 * Deterministic regression for the accept-focus commit ordering of the real `src/Handover.tsx`
 * (verification §31).
 *
 * The component is mounted unchanged through a route-fulfilled page (harness:
 * `e2e/fixtures/handover-focus-harness.tsx`), and the test forces an order the application itself
 * can produce: the accepted task is committed while the acceptance feedback is still `pending`, so
 * the surviving `Resolve task` trigger mounts disabled; the confirmed feedback then enables it.
 * The surviving own trigger must end up focused once the flow is confirmed.
 *
 * It is the in-repository version of the frozen outside-root RED fixture; the ordering, commits and
 * final assertion are the same.
 */
import { expect, test } from "@playwright/test";

const HARNESS_HTML = `<!doctype html>
<html lang="en">
  <body>
    <div id="root"></div>
    <script type="module" src="/e2e/fixtures/handover-focus-harness.tsx"></script>
  </body>
</html>
`;

test("accepted task committed while accept feedback is pending must not strand focus", async ({ page }) => {
  await page.route("**/__handover-focus-harness.html", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: HARNESS_HTML }),
  );
  await page.goto("/__handover-focus-harness.html");

  const accept = page.getByRole("button", { name: "Accept task: Fixture task" });
  const resolve = page.getByRole("button", { name: "Resolve task: Fixture task" });
  await expect(accept).toBeVisible();

  // Real keyboard activation of the real accept control, as in the accessibility spec.
  await accept.focus();
  await page.keyboard.press("Enter");

  // Commit 1: the component's own pending feedback (what App.tsx renders while awaiting the server).
  await page.evaluate(() => {
    window.__fixture.commit({
      feedback: { taskId: "fixture-task-1", tone: "pending", message: "Sending" },
    });
  });
  await expect(accept).toBeDisabled();

  // Commit 2: the accepted task is committed while the feedback is still pending, so the surviving
  // trigger mounts disabled. This is the ordering that stranded focus on BODY.
  await page.evaluate(() => {
    window.__fixture.commit({ tasks: [window.__fixture.acceptedTask] });
  });
  await expect(resolve).toBeDisabled();
  await expect(accept).toHaveCount(0);
  // Let this commit's effects run before the enabling commit, so the two commits stay ordered.
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));

  // Commit 3: the confirmation the same flow delivers next; the trigger becomes enabled.
  await page.evaluate(() => {
    window.__fixture.commit({
      feedback: { taskId: "fixture-task-1", tone: "confirmed", message: "Accepted" },
    });
  });
  await expect(resolve).toBeEnabled();
  await page.evaluate(() => window.__fixture.settleAccept(true));

  await expect(resolve).toBeFocused();
});
