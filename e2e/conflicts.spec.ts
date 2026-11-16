import { expect, test } from "@playwright/test";
import {
  integerField,
  openSession,
  readActivity,
  readTask,
  stringField,
  taskIdsOf,
  waitForHandover,
  publishCardsViaUi,
} from "./support";

test.describe("ownership races", () => {
  test("two incoming sessions race one accept: exactly one owner and one event", async ({ browser }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const first = await openSession(browser, "incoming", "incoming-a");
    const second = await openSession(browser, "incoming", "incoming-b");
    const title = `Race task ${Date.now()}`;
    await publishCardsViaUi(outgoing.page, "Private race note", [{ title, detail: "One owner only." }]);
    const handover = await waitForHandover(outgoing.uid, title);
    const [taskId] = taskIdsOf(handover);
    expect(taskId).toBeDefined();

    for (const session of [first, second]) {
      await session.page.getByRole("button", { name: "Refresh shared tasks" }).click();
      await expect(session.page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }

    await Promise.allSettled([
      first.page.getByRole("button", { name: `Accept task: ${title}` }).click(),
      second.page.getByRole("button", { name: `Accept task: ${title}` }).click(),
    ]);

    await expect
      .poll(async () => stringField(await readTask(taskId!), "state"))
      .toBe("accepted");
    const task = await readTask(taskId!);
    const owner = stringField(task, "ownerId");
    expect([first.uid, second.uid]).toContain(owner);
    expect(integerField(task, "version")).toBe(2);

    const acceptance = await readActivity(taskId!, 2);
    expect(stringField(acceptance, "action")).toBe("accept");
    expect(stringField(acceptance, "actorId")).toBe(owner);
    expect(await readActivity(taskId!, 3)).toBeNull();

    const winner = owner === first.uid ? first : second;
    const loser = owner === first.uid ? second : first;
    await expect(winner.page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    await expect(loser.page.getByRole("alert")).toContainText("Conflict");

    await loser.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(loser.page.getByRole("button", { name: `Accept task: ${title}` })).toHaveCount(0);
    await expect(
      loser.page.getByRole("article", { name: title }).getByText("Another incoming volunteer"),
    ).toBeVisible();
  });
});
