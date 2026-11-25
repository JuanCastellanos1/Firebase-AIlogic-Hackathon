import { expect, test } from "@playwright/test";
import {
  integerField,
  listHandovers,
  openSession,
  publishCardsViaUi,
  readActivity,
  readTask,
  stringField,
  taskIdsOf,
  waitForHandover,
} from "./support";

test.describe("offline behavior", () => {
  test("offline share is unconfirmed and never queued; explicit server check and retry publish once", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const title = `Offline publish ${Date.now()}`;
    await outgoing.page.getByLabel("Private shift note (not shared)").fill("Private offline note");
    await outgoing.page.getByLabel("Card 1 title").fill(title);
    await outgoing.page.getByRole("button", { name: "Review cards" }).click();
    await expect(outgoing.page.getByRole("heading", { name: "Review exact shared fields" })).toBeVisible();

    await outgoing.context.setOffline(true);
    await outgoing.page.getByRole("button", { name: "Share handover" }).click();
    await expect(outgoing.page.getByText(/Not confirmed/)).toBeVisible({ timeout: 30_000 });

    const before = (await listHandovers()).filter(
      (handover) => stringField(handover, "creatorId") === outgoing.uid,
    );
    expect(before).toHaveLength(0);

    await outgoing.context.setOffline(false);
    await outgoing.page.getByRole("button", { name: "Check server" }).click();
    await expect(outgoing.page.getByText(/no publication with these IDs yet/)).toBeVisible();

    await outgoing.page.getByRole("button", { name: "Share handover" }).click();
    await expect(outgoing.page.getByText(/Server confirmed 1 open task/)).toBeVisible();
    const handover = await waitForHandover(outgoing.uid, title);
    const [taskId] = taskIdsOf(handover);
    expect(taskId).toBeDefined();
    expect(stringField(await readTask(taskId!), "state")).toBe("open");
    expect(await readActivity(taskId!, 1)).not.toBeNull();
    expect(await readActivity(taskId!, 2)).toBeNull();

    const after = (await listHandovers()).filter(
      (entry) => stringField(entry, "creatorId") === outgoing.uid,
    );
    expect(after).toHaveLength(1);
  });

  test("offline accept and resolve stay unconfirmed and do not change the task", async ({ browser }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const incoming = await openSession(browser, "incoming", "incoming");
    const title = `Offline ownership ${Date.now()}`;
    await publishCardsViaUi(outgoing.page, "Private note", [{ title, detail: "Keep this open." }]);
    const handover = await waitForHandover(outgoing.uid, title);
    const [taskId] = taskIdsOf(handover);
    expect(taskId).toBeDefined();

    await incoming.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(incoming.page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await incoming.context.setOffline(true);
    await incoming.page.getByRole("button", { name: `Accept task: ${title}` }).click();
    await expect(incoming.page.getByText(/Not confirmed/)).toBeVisible({ timeout: 30_000 });
    let task = await readTask(taskId!);
    expect(stringField(task, "state")).toBe("open");
    expect(integerField(task, "version")).toBe(1);
    expect(await readActivity(taskId!, 2)).toBeNull();

    await incoming.context.setOffline(false);
    await incoming.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(incoming.page.getByRole("button", { name: `Accept task: ${title}` })).toBeVisible();
    await incoming.page.getByRole("button", { name: `Accept task: ${title}` }).click();
    await expect(incoming.page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    task = await readTask(taskId!);
    expect(stringField(task, "ownerId")).toBe(incoming.uid);

    await incoming.page.getByRole("button", { name: `Resolve task: ${title}` }).click();
    await incoming.page.getByLabel("Resolution").fill("Resolution typed before disconnect.");
    await incoming.context.setOffline(true);
    await incoming.page.getByRole("button", { name: "Confirm resolution" }).click();
    await expect(incoming.page.getByText(/Not confirmed/)).toBeVisible({ timeout: 30_000 });
    task = await readTask(taskId!);
    expect(stringField(task, "state")).toBe("accepted");
    expect(integerField(task, "version")).toBe(2);
    expect(await readActivity(taskId!, 3)).toBeNull();

    await incoming.context.setOffline(false);
    await incoming.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(incoming.page.getByRole("button", { name: `Resolve task: ${title}` })).toBeVisible();
    await incoming.page.getByRole("button", { name: `Resolve task: ${title}` }).click();
    await incoming.page.getByLabel("Resolution").fill("Resolution after reconnect.");
    await incoming.page.getByRole("button", { name: "Confirm resolution" }).click();
    await expect(incoming.page.getByText(/Resolved\. The server recorded the resolution/)).toBeVisible();
    task = await readTask(taskId!);
    expect(stringField(task, "state")).toBe("resolved");
    expect(integerField(task, "version")).toBe(3);
    expect(await readActivity(taskId!, 3)).not.toBeNull();
  });
});
