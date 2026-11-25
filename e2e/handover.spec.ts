import { expect, test } from "@playwright/test";
import {
  integerField,
  openSession,
  publishCardsViaUi,
  readActivity,
  readTask,
  stringField,
  taskIdsOf,
  waitForHandover,
} from "./support";

test.describe("manual handover through closure", () => {
  test("outgoing publishes three reviewed cards and incoming accepts, resolves and reopens one", async ({
    browser,
  }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const incoming = await openSession(browser, "incoming", "incoming");
    const sentinel = `PRIVATE-SENTINEL-${Date.now()}`;
    const suffix = String(Date.now()).slice(-6);
    const cards = [
      { title: `Restock projector bulbs ${suffix}`, detail: "Two spares are in the locked cupboard." },
      { title: `Return borrowed cable kit ${suffix}`, detail: "" },
      { title: `Water entrance plants ${suffix}`, detail: "Every second day, left of the main door." },
    ];

    await publishCardsViaUi(outgoing.page, `Private note ${sentinel}: call the supplier?`, cards);

    const handover = await waitForHandover(outgoing.uid, cards[0]!.title);
    const taskIds = taskIdsOf(handover);
    expect(taskIds).toHaveLength(3);

    for (const [index, taskId] of taskIds.entries()) {
      const task = await readTask(taskId);
      expect(stringField(task, "title")).toBe(cards[index]!.title);
      expect(stringField(task, "detail")).toBe(cards[index]!.detail);
      expect(stringField(task, "state")).toBe("open");
      expect(integerField(task, "version")).toBe(1);
      expect(stringField(task, "ownerId")).toBeNull();
      expect(stringField(task, "creatorId")).toBe(outgoing.uid);
      expect(await readActivity(taskId, 1)).not.toBeNull();
      expect(JSON.stringify(task)).not.toContain(sentinel);
    }
    expect(JSON.stringify(handover)).not.toContain(sentinel);
    expect(JSON.stringify(await readActivity(taskIds[0]!, 1))).not.toContain(sentinel);

    await incoming.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    for (const card of cards) {
      await expect(incoming.page.getByRole("heading", { name: card.title, exact: true })).toBeVisible();
    }
    await expect(incoming.page.locator("body")).not.toContainText(sentinel);

    const firstTaskId = taskIds[0]!;
    await incoming.page.getByRole("button", { name: `Accept task: ${cards[0]!.title}` }).click();
    await expect(incoming.page.getByText(/Accepted\. The server recorded you as owner/)).toBeVisible();
    let task = await readTask(firstTaskId);
    expect(stringField(task, "state")).toBe("accepted");
    expect(integerField(task, "version")).toBe(2);
    expect(stringField(task, "ownerId")).toBe(incoming.uid);
    const accept = await readActivity(firstTaskId, 2);
    expect(stringField(accept, "action")).toBe("accept");
    expect(stringField(accept, "actorId")).toBe(incoming.uid);

    const resolution = `Bulbs replaced and tested ${suffix}.`;
    await incoming.page.getByRole("button", { name: `Resolve task: ${cards[0]!.title}` }).click();
    await incoming.page.getByLabel("Resolution").fill(resolution);
    await incoming.page.getByRole("button", { name: "Confirm resolution" }).click();
    await expect(incoming.page.getByText(/Resolved\. The server recorded the resolution/)).toBeVisible();
    task = await readTask(firstTaskId);
    expect(stringField(task, "state")).toBe("resolved");
    expect(integerField(task, "version")).toBe(3);
    expect(stringField(task, "resolution")).toBe(resolution);
    expect(stringField(await readActivity(firstTaskId, 3), "resolution")).toBe(resolution);

    const reason = `Housing cracked again ${suffix}.`;
    await incoming.page.getByRole("button", { name: `Reopen task: ${cards[0]!.title}` }).click();
    await incoming.page.getByLabel("Reason for reopening").fill(reason);
    await incoming.page.getByRole("button", { name: "Confirm reopen" }).click();
    await expect(incoming.page.getByText(/Reopened\. The owner is unchanged/)).toBeVisible();
    task = await readTask(firstTaskId);
    expect(stringField(task, "state")).toBe("accepted");
    expect(integerField(task, "version")).toBe(4);
    expect(stringField(task, "resolution")).toBeNull();
    expect(stringField(await readActivity(firstTaskId, 3), "resolution")).toBe(resolution);
    expect(stringField(await readActivity(firstTaskId, 4), "reason")).toBe(reason);

    await expect(incoming.page.getByText(resolution)).toBeVisible();
    await expect(incoming.page.getByText(reason)).toBeVisible();

    await incoming.page.getByRole("button", { name: "Sign out" }).click();
    await expect(incoming.page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(incoming.page.getByRole("heading", { name: cards[0]!.title, exact: true })).toHaveCount(0);

    // The other two cards stayed open and unowned.
    for (const taskId of taskIds.slice(1)) {
      expect(stringField(await readTask(taskId), "state")).toBe("open");
      expect(stringField(await readTask(taskId), "ownerId")).toBeNull();
    }
  });
});
