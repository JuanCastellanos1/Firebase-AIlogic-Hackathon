/**
 * Rules-test plumbing for the local `demo-shiftrelay` Firestore emulator only.
 *
 * Identity uses the modular SDK's emulator mock token; seeding uses the emulator's
 * rules-disabled mode through @firebase/rules-unit-testing. No Admin credentials, no
 * production project, no network beyond 127.0.0.1:8080.
 */
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  writeBatch,
  type FieldValue,
  type Firestore,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { activityIdFor, type ActivityRecord, type Handover, type PublicationPlan, type Task } from "../../src/domain";
import { makeTask } from "../fixtures/handover";

export const PROJECT_ID = "demo-shiftrelay";
export const HOST = "127.0.0.1";
export const PORT = 8080;

export const VENUE = "venue-hall-01";
export const OTHER_VENUE = "venue-hall-02";
export const OUTGOING = "outgoing-robin";
export const INCOMING = "incoming-sam";
export const INCOMING_TWO = "incoming-lee";
export const OTHER_VENUE_OUTGOING = "outgoing-noor";
export const NONMEMBER = "stranger-ivy";

type App = FirebaseApp;
const apps: App[] = [];
let appCounter = 0;

/** A distinct client per identity: separate app, separate Firestore, explicit emulator host. */
export function client(uid: string | null): Firestore {
  const app = initializeApp(
    { projectId: PROJECT_ID, apiKey: "demo-api-key" },
    `rules-client-${(appCounter += 1)}`,
  );
  apps.push(app);
  const db = getFirestore(app);
  if (uid === null) {
    connectFirestoreEmulator(db, HOST, PORT);
  } else {
    connectFirestoreEmulator(db, HOST, PORT, { mockUserToken: { user_id: uid } });
  }
  return db;
}

export async function closeClients(): Promise<void> {
  await Promise.all(apps.splice(0).map((app) => deleteApp(app)));
}

/** Uploads the real firestore.rules under test; fails loudly when the file is missing. */
export async function createEnvironment(): Promise<RulesTestEnvironment> {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: HOST, port: PORT },
  });
}

export interface SeedDoc {
  path: string;
  data: Record<string, unknown>;
}

/** Rules-disabled seeding, the only use of the emulator's bypass mode in this project. */
export async function seed(env: RulesTestEnvironment, docs: readonly SeedDoc[]): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    for (const entry of docs) {
      await context.firestore().doc(entry.path).set(entry.data);
    }
  });
}

export const paths = {
  member: (venueId: string, uid: string) => `venues/${venueId}/members/${uid}`,
  handover: (venueId: string, handoverId: string) => `venues/${venueId}/handovers/${handoverId}`,
  task: (venueId: string, taskId: string) => `venues/${venueId}/tasks/${taskId}`,
  activity: (venueId: string, activityId: string) => `venues/${venueId}/activities/${activityId}`,
};

export const seededAt = Timestamp.fromDate(new Date("2026-11-16T09:00:00Z"));

export function taskDoc(task: Task, at: Timestamp | FieldValue = seededAt): Record<string, unknown> {
  return { ...task, createdAt: at, updatedAt: at };
}

export function activityDoc(
  activity: ActivityRecord,
  at: Timestamp | FieldValue = seededAt,
): Record<string, unknown> {
  return { ...activity, at };
}

export function handoverDoc(
  handover: Handover,
  at: Timestamp | FieldValue = seededAt,
): Record<string, unknown> {
  return { ...handover, createdAt: at };
}

export const OPEN_TASK = makeTask({
  id: "task-open-1",
  title: "Restock projector bulbs",
  detail: "Two spare bulbs are in the storage cupboard.",
});
export const OPEN_TASK_TWO = makeTask({
  id: "task-open-2",
  title: "Return borrowed cable kit",
  detail: "",
});
export const ACCEPTED_TASK = makeTask({
  id: "task-accepted-1",
  title: "Water the entrance plants",
  detail: "Left of the main door.",
  state: "accepted",
  ownerId: INCOMING,
});
export const RESOLVED_TASK = makeTask({
  id: "task-resolved-1",
  title: "Replace entrance mat",
  detail: "",
  state: "resolved",
  ownerId: INCOMING,
  resolution: "Replaced before lock-up.",
});
export const OTHER_VENUE_TASK = makeTask({
  id: "task-other-1",
  venueId: OTHER_VENUE,
  handoverId: "handover-other-1",
  creatorId: OTHER_VENUE_OUTGOING,
  title: "Other venue task",
  detail: "",
});
export const SEED_HANDOVER: Handover = {
  id: "handover-seed-1",
  venueId: VENUE,
  creatorId: OUTGOING,
  taskIds: [OPEN_TASK.id],
};

function createActivity(task: Task): ActivityRecord {
  return {
    id: activityIdFor(task.id, 1),
    taskId: task.id,
    venueId: task.venueId,
    actorId: task.creatorId,
    action: "create",
    fromState: null,
    toState: "open",
    fromVersion: null,
    toVersion: 1,
    resolution: null,
    reason: null,
    observation: null,
  };
}

/** Baseline data: three venue members, one other-venue member, four tasks, one handover. */
export function baseSeed(): SeedDoc[] {
  return [
    { path: paths.member(VENUE, OUTGOING), data: { uid: OUTGOING, venueId: VENUE, role: "outgoing" } },
    { path: paths.member(VENUE, INCOMING), data: { uid: INCOMING, venueId: VENUE, role: "incoming" } },
    { path: paths.member(VENUE, INCOMING_TWO), data: { uid: INCOMING_TWO, venueId: VENUE, role: "incoming" } },
    {
      path: paths.member(OTHER_VENUE, OTHER_VENUE_OUTGOING),
      data: { uid: OTHER_VENUE_OUTGOING, venueId: OTHER_VENUE, role: "outgoing" },
    },
    { path: paths.handover(VENUE, SEED_HANDOVER.id), data: handoverDoc(SEED_HANDOVER) },
    { path: paths.task(VENUE, OPEN_TASK.id), data: taskDoc(OPEN_TASK) },
    { path: paths.task(VENUE, OPEN_TASK_TWO.id), data: taskDoc(OPEN_TASK_TWO) },
    { path: paths.task(VENUE, ACCEPTED_TASK.id), data: taskDoc(ACCEPTED_TASK) },
    { path: paths.task(VENUE, RESOLVED_TASK.id), data: taskDoc(RESOLVED_TASK) },
    { path: paths.task(OTHER_VENUE, OTHER_VENUE_TASK.id), data: taskDoc(OTHER_VENUE_TASK) },
    { path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 1)), data: activityDoc(createActivity(OPEN_TASK)) },
  ];
}

export async function readData(
  db: Firestore,
  path: string,
): Promise<Record<string, unknown> | null> {
  const snapshot = await getDoc(doc(db, path));
  return snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;
}

/** One batched commit, so Rules see exactly the post-state the caller submits. */
export async function writeDocs(db: Firestore, docs: readonly SeedDoc[]): Promise<void> {
  const batch = writeBatch(db);
  for (const entry of docs) {
    batch.set(doc(db, entry.path), entry.data);
  }
  await batch.commit();
}

/** Raw publication ops, so tests can tamper with or drop one part of the atomic batch. */
export function publicationOps(plan: PublicationPlan): SeedDoc[] {
  return [
    { path: paths.handover(plan.handover.venueId, plan.handover.id), data: handoverDoc(plan.handover, serverTimestamp()) },
    ...plan.tasks.map((task) => ({
      path: paths.task(task.venueId, task.id),
      data: taskDoc(task, serverTimestamp()),
    })),
    ...plan.activities.map((activity) => ({
      path: paths.activity(activity.venueId, activity.id),
      data: activityDoc(activity, serverTimestamp()),
    })),
  ];
}

export interface ActivityOverrides {
  readonly actorId?: string;
  readonly id?: string;
  readonly at?: Timestamp | FieldValue;
  readonly resolution?: string | null;
  readonly reason?: string | null;
  readonly observation?: ActivityRecord["observation"];
}

export function activityOf(
  taskId: string,
  action: ActivityRecord["action"],
  previous: { readonly state: string; readonly version: number } | null,
  next: { readonly state: string; readonly version: number },
  overrides: ActivityOverrides = {},
): Record<string, unknown> {
  return {
    id: overrides.id ?? activityIdFor(taskId, next.version),
    taskId,
    venueId: VENUE,
    actorId: overrides.actorId ?? INCOMING,
    action,
    fromState: previous === null ? null : previous.state,
    toState: next.state,
    fromVersion: previous === null ? null : previous.version,
    toVersion: next.version,
    resolution: overrides.resolution ?? null,
    reason: overrides.reason ?? null,
    observation: overrides.observation ?? null,
    at: overrides.at ?? serverTimestamp(),
  };
}
