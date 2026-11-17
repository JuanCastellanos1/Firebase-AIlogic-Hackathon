/**
 * Auth-scoped reads and the stale-result guard. Every value here is either the frozen
 * domain contract or display metadata; private draft text never enters this module.
 */
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  limit,
  onSnapshot,
  query,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  ACTIVITY_ACTIONS,
  ROLES,
  type ActivityAction,
  type ActivityRecord,
  type ObservationRecord,
  type Role,
  type Task,
} from "./domain";
import { taskFromData } from "./tasks";
import { ContractError } from "./validation";

export const VENUE_ID = "venue-hall-01";
export const VENUE_NAME = "Riverside Community Hall";
const QUERY_LIMIT = 50;

export interface Membership {
  readonly uid: string;
  readonly venueId: string;
  readonly role: Role;
}

export interface ActivityView extends ActivityRecord {
  readonly at: Timestamp | null;
}

export interface SessionGuard {
  snapshot(): number;
  invalidate(): number;
  current(epoch: number): boolean;
}

/** Increments on sign-out or revocation; every async result checks its captured epoch. */
export function createSessionGuard(): SessionGuard {
  let epoch = 0;
  return {
    snapshot: () => epoch,
    invalidate: () => {
      epoch += 1;
      return epoch;
    },
    current: (candidate) => candidate === epoch,
  };
}

function asMembership(uid: string, data: Record<string, unknown>): Membership | null {
  const role = data.role;
  if (
    data.uid !== uid ||
    data.venueId !== VENUE_ID ||
    typeof role !== "string" ||
    !(ROLES as readonly string[]).includes(role)
  ) {
    return null;
  }
  return { uid, venueId: VENUE_ID, role: role as Role };
}

/** Membership is provisioned out of band; there is no client write path. */
export async function readMembership(db: Firestore, uid: string): Promise<Membership | null> {
  const snapshot = await getDocFromServer(doc(db, "venues", VENUE_ID, "members", uid));
  return snapshot.exists()
    ? asMembership(uid, snapshot.data() as Record<string, unknown>)
    : null;
}

export function watchMembership(
  db: Firestore,
  uid: string,
  onChange: (membership: Membership | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "venues", VENUE_ID, "members", uid),
    (snapshot) => {
      onChange(
        snapshot.exists()
          ? asMembership(uid, snapshot.data() as Record<string, unknown>)
          : null,
      );
    },
    onError,
  );
}

export async function readTasks(db: Firestore): Promise<Task[]> {
  const snapshot = await getDocsFromServer(
    query(collection(db, "venues", VENUE_ID, "tasks"), limit(QUERY_LIMIT)),
  );
  return snapshot.docs
    .map((entry) => taskFromData(entry.id, entry.data() as Record<string, unknown>))
    .sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
}

/** Display-only parse of a persisted observation; anything malformed stays hidden. */
function asObservation(value: unknown): ObservationRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  if (
    (kind !== "duplicate" && kind !== "contradiction") ||
    typeof record.targetTaskId !== "string" ||
    typeof record.targetVersion !== "number" ||
    typeof record.rationale !== "string"
  ) {
    return null;
  }
  return {
    kind,
    targetTaskId: record.targetTaskId,
    targetVersion: record.targetVersion,
    rationale: record.rationale,
  };
}

export async function readActivities(db: Firestore): Promise<ActivityView[]> {
  const snapshot = await getDocsFromServer(
    query(collection(db, "venues", VENUE_ID, "activities"), limit(QUERY_LIMIT)),
  );
  const activities: ActivityView[] = [];
  for (const entry of snapshot.docs) {
    const data = entry.data() as Record<string, unknown>;
    const action = data.action;
    if (typeof action !== "string" || !(ACTIVITY_ACTIONS as readonly string[]).includes(action)) {
      continue;
    }
    if (typeof data.taskId !== "string" || typeof data.actorId !== "string") {
      continue;
    }
    activities.push({
      id: entry.id,
      taskId: data.taskId,
      venueId: VENUE_ID,
      actorId: data.actorId,
      action: action as ActivityAction,
      fromState: (data.fromState ?? null) as ActivityRecord["fromState"],
      toState: data.toState as ActivityRecord["toState"],
      fromVersion: typeof data.fromVersion === "number" ? data.fromVersion : null,
      toVersion: typeof data.toVersion === "number" ? data.toVersion : 0,
      resolution: typeof data.resolution === "string" ? data.resolution : null,
      reason: typeof data.reason === "string" ? data.reason : null,
      observation: asObservation(data.observation),
      at: (data.at as Timestamp | undefined) ?? null,
    });
  }
  return activities.sort((left, right) => left.toVersion - right.toVersion);
}

export function describeFailure(error: unknown): string {
  if (error instanceof ContractError) {
    switch (error.code) {
      case "stale_version":
      case "stale_target":
        return "Conflict: this task changed since you loaded it. Refresh to see the current owner.";
      case "forbidden_transition":
      case "actor_not_owner":
        return "Conflict: the current task state does not allow that action. Refresh and review it.";
      case "byte_limit_exceeded":
        return `The text is over the ${error.limit ?? "allowed"} byte limit. Shorten it and try again.`;
      case "blank_required":
        return "Enter the required text before continuing.";
      default:
        return `Input rejected (${error.code}). Review the fields and try again.`;
    }
  }
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Not confirmed: the emulator is unreachable. No write is queued; reconnect, refresh, then act again.";
  }
  if (code === "permission-denied") {
    return "Conflict: Firestore Rules rejected this change, usually because another member changed the task. Refresh and review it.";
  }
  return "Not confirmed: the server did not acknowledge the action. Refresh and review before retrying.";
}

export function describeSignInFailure(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "Sign-in failed. Check the email and password.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a moment and try again.";
  }
  return "Sign-in failed. Check the local Auth emulator and the documented setup.";
}
