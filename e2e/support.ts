/**
 * Synthetic emulator plumbing for Playwright. Every request is guarded to the demo project
 * and 127.0.0.1; passwords are generated per run and never written to source or disk.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

const PROJECT_ID = process.env.SHIFTRELAY_PROJECT_ID ?? "demo-shiftrelay";
const HOST = process.env.SHIFTRELAY_EMULATOR_HOST ?? "127.0.0.1";

if (PROJECT_ID !== "demo-shiftrelay" || (HOST !== "127.0.0.1" && HOST !== "localhost")) {
  throw new Error("E2E helpers refuse a non-demo project or non-local emulator host");
}

export const VENUE = "venue-hall-01";
export const FIRESTORE_ORIGIN = `http://${HOST}:8080`;
export const AUTH_ORIGIN = `http://${HOST}:9099`;
const DOCUMENTS = `${FIRESTORE_ORIGIN}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = { Authorization: "Bearer owner" };

export interface EmulatorUser {
  readonly uid: string;
  readonly email: string;
  readonly password: string;
}

export interface EmulatorSession extends EmulatorUser {
  readonly context: BrowserContext;
  readonly page: Page;
}

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok && response.status !== 404) {
    throw new Error(`emulator request failed: ${response.status} ${url}`);
  }
  return response;
}

/** Clears only the local demo emulator. Called once per Playwright run. */
export async function resetEmulator(): Promise<void> {
  await request(`${FIRESTORE_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE",
    headers: OWNER,
  });
  await request(`${AUTH_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
}

function documentUrl(path: string): string {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${DOCUMENTS}/${encoded}`;
}

export async function grantMembership(uid: string, role: "outgoing" | "incoming"): Promise<void> {
  await request(documentUrl(`venues/${VENUE}/members/${uid}`), {
    method: "PATCH",
    headers: { ...OWNER, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: uid },
        venueId: { stringValue: VENUE },
        role: { stringValue: role },
      },
    }),
  });
}

export async function revokeMembership(uid: string): Promise<void> {
  await request(documentUrl(`venues/${VENUE}/members/${uid}`), {
    method: "DELETE",
    headers: OWNER,
  });
}

export async function createUser(label: string, role: "outgoing" | "incoming"): Promise<EmulatorUser> {
  const password = randomBytes(18).toString("base64url");
  const email = `shiftrelay.${label}.${randomUUID()}@example.invalid`;
  const response = await request(
    `${AUTH_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-shiftrelay-local-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { localId?: string };
  if (typeof body.localId !== "string") {
    throw new Error("Auth emulator did not return a synthetic user id");
  }
  await grantMembership(body.localId, role);
  return { uid: body.localId, email, password };
}

export async function signIn(page: Page, user: EmulatorUser): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Shift handover" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Task queue" })).toBeVisible();
}

export async function openSession(
  browser: Browser,
  role: "outgoing" | "incoming",
  label: string,
): Promise<EmulatorSession> {
  const user = await createUser(label, role);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
  const page = await context.newPage();
  await signIn(page, user);
  return { ...user, context, page };
}

export interface RawValue {
  readonly stringValue?: string;
  readonly integerValue?: string;
  readonly booleanValue?: boolean;
  readonly nullValue?: null;
}

export interface RawDocument {
  readonly name: string;
  readonly fields?: Record<string, RawValue | { arrayValue?: { values?: { stringValue?: string }[] } }>;
}

export async function readDocument(path: string): Promise<RawDocument | null> {
  const response = await request(documentUrl(path), { headers: OWNER });
  if (response.status === 404) {
    return null;
  }
  return (await response.json()) as RawDocument;
}

export function stringField(document: RawDocument | null, name: string): string | null {
  const value = document?.fields?.[name];
  return value !== undefined && "stringValue" in value ? value.stringValue ?? null : null;
}

export function integerField(document: RawDocument | null, name: string): number | null {
  const value = document?.fields?.[name];
  if (value === undefined || !("integerValue" in value) || value.integerValue === undefined) {
    return null;
  }
  return Number(value.integerValue);
}

export function taskIdsOf(handover: RawDocument | null): string[] {
  const value = handover?.fields?.taskIds;
  return value !== undefined && "arrayValue" in value
    ? value.arrayValue?.values?.map((entry) => entry.stringValue ?? "") ?? []
    : [];
}

export async function readHandover(handoverId: string): Promise<RawDocument | null> {
  return readDocument(`venues/${VENUE}/handovers/${handoverId}`);
}

export async function readTask(taskId: string): Promise<RawDocument | null> {
  return readDocument(`venues/${VENUE}/tasks/${taskId}`);
}

export async function readActivity(taskId: string, version: number): Promise<RawDocument | null> {
  return readDocument(`venues/${VENUE}/activities/${taskId}__v${version}`);
}

export async function listHandovers(): Promise<RawDocument[]> {
  const response = await request(`${DOCUMENTS}/venues/${VENUE}/handovers?pageSize=100`, { headers: OWNER });
  const body = (await response.json()) as { documents?: RawDocument[] };
  return body.documents ?? [];
}

export interface CardInput {
  readonly title: string;
  readonly detail: string;
}

/** Drives the real UI: raw note, manual cards, review, explicit share. */
export async function publishCardsViaUi(
  page: Page,
  rawNote: string,
  cards: readonly CardInput[],
): Promise<void> {
  await page.getByLabel("Private shift note (not shared)").fill(rawNote);
  for (const [index, card] of cards.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Add card" }).click();
    }
    await page.getByLabel(`Card ${index + 1} title`).fill(card.title);
    await page.getByLabel(`Card ${index + 1} detail`).fill(card.detail);
  }
  await page.getByRole("button", { name: "Review cards" }).click();
  await expect(page.getByRole("heading", { name: "Review exact shared fields" })).toBeVisible();
  await page.getByRole("button", { name: "Share handover" }).click();
  await expect(page.getByText(/Server confirmed \d+ open task/)).toBeVisible();
}

/** Finds the committed handover whose first task has this exact title. */
export async function waitForHandover(creatorId: string, firstTitle: string): Promise<RawDocument> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    for (const handover of await listHandovers()) {
      if (stringField(handover, "creatorId") !== creatorId) {
        continue;
      }
      const [firstTaskId] = taskIdsOf(handover);
      if (firstTaskId === undefined) {
        continue;
      }
      const task = await readTask(firstTaskId);
      if (stringField(task, "title") === firstTitle) {
        return handover;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("published handover was not found on the emulator");
}

/** All Firestore documents are read through the emulator's owner bypass for assertions. */
export async function readTaskVersions(taskId: string): Promise<number[]> {
  const versions: number[] = [];
  for (let version = 1; version <= 6; version += 1) {
    if ((await readActivity(taskId, version)) !== null) {
      versions.push(version);
    }
  }
  return versions;
}

export function newTitle(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`;
}
