import { expect, test } from "@playwright/test";
import {
  openSession,
  publishCardsViaUi,
  readActivity,
  readTask,
  revokeMembership,
  taskIdsOf,
  waitForHandover,
} from "./support";

test.describe("privacy boundary", () => {
  test("private sentinel never reaches storage, requests, console, URL or Firestore", async ({ browser }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const sentinel = `PRIVACY-SENTINEL-${Date.now()}-${Math.random()}`;
    const title = `Shared title ${Date.now()}`;
    const requests: string[] = [];
    const consoleText: string[] = [];
    outgoing.page.on("request", (request) => {
      requests.push(`${request.url()} ${request.postData() ?? ""}`);
    });
    outgoing.page.on("console", (message) => consoleText.push(message.text()));
    outgoing.page.on("pageerror", (error) => consoleText.push(error.message));

    await publishCardsViaUi(outgoing.page, `Private note ${sentinel}`, [
      { title, detail: "Only this approved detail is shared." },
    ]);
    const handover = await waitForHandover(outgoing.uid, title);
    const [taskId] = taskIdsOf(handover);
    expect(taskId).toBeDefined();

    const storage = await outgoing.page.evaluate(async () => {
      const databases = await indexedDB.databases();
      let dump = "";
      for (const entry of databases) {
        if (!entry.name) {
          continue;
        }
        try {
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(entry.name as string);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          for (const storeName of Array.from(database.objectStoreNames)) {
            const transaction = database.transaction(storeName, "readonly");
            const records = await new Promise<unknown[]>((resolve, reject) => {
              const request = transaction.objectStore(storeName).getAll();
              request.onsuccess = () => resolve(request.result as unknown[]);
              request.onerror = () => reject(request.error);
            });
            dump += JSON.stringify(records);
          }
          database.close();
        } catch {
          dump += "[unreadable]";
        }
      }
      return {
        local: JSON.stringify(localStorage),
        session: JSON.stringify(sessionStorage),
        databases: databases.map((entry) => entry.name ?? ""),
        dump,
        url: location.href,
      };
    });
    expect(storage.local).not.toContain(sentinel);
    expect(storage.session).not.toContain(sentinel);
    expect(storage.url).not.toContain(sentinel);
    expect(storage.dump).not.toContain(sentinel);
    // Auth is in-memory and Firestore uses a memory cache. The Firebase heartbeat
    // database is metadata only and is checked for sentinel text above.
    expect(storage.databases.filter((name) => /firebaselocalstorage|firestore/i.test(name))).toEqual([]);

    expect(requests.join("\n")).not.toContain(sentinel);
    expect(consoleText.join("\n")).not.toContain(sentinel);
    expect(JSON.stringify(await readTask(taskId!))).not.toContain(sentinel);
    expect(JSON.stringify(await readActivity(taskId!, 1))).not.toContain(sentinel);
    expect(JSON.stringify(handover)).not.toContain(sentinel);

    await outgoing.page.getByRole("button", { name: "Sign out" }).click();
    await expect(outgoing.page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(outgoing.page.locator("body")).not.toContainText(sentinel);
    const afterSignOut = await outgoing.page.evaluate(
      () => `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)} ${location.href}`,
    );
    expect(afterSignOut).not.toContain(sentinel);
  });

  test("member revocation clears private and shared state from the page", async ({ browser }) => {
    const outgoing = await openSession(browser, "outgoing", "outgoing");
    const incoming = await openSession(browser, "incoming", "incoming");
    const sentinel = `REVOKED-PRIVATE-${Date.now()}`;
    const title = `Revoked shared ${Date.now()}`;
    await publishCardsViaUi(outgoing.page, "Private note", [{ title, detail: "" }]);
    await waitForHandover(outgoing.uid, title);
    await outgoing.page.getByLabel("Private shift note (not shared)").fill(`Private ${sentinel}`);
    await outgoing.page.getByRole("button", { name: "Add card" }).click();
    await outgoing.page.getByLabel("Card 2 title").fill("Unshared card");

    await revokeMembership(outgoing.uid);
    await expect(outgoing.page.getByRole("heading", { name: "No venue access" })).toBeVisible();
    await expect(outgoing.page.locator("body")).not.toContainText(sentinel);
    await expect(outgoing.page.getByText("Unshared card")).toHaveCount(0);
    await expect(outgoing.page.getByRole("heading", { name: "Task queue" })).toHaveCount(0);

    await incoming.page.getByRole("button", { name: "Refresh shared tasks" }).click();
    await expect(incoming.page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await revokeMembership(incoming.uid);
    await expect(incoming.page.getByRole("heading", { name: "No venue access" })).toBeVisible();
    await expect(incoming.page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await expect(incoming.page.getByRole("heading", { name: "Task queue" })).toHaveCount(0);
  });
});
