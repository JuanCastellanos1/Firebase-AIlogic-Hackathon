/**
 * Firestore adapter for the frozen contract. Publication uses a transaction, never a
 * batch: a batch is persisted by the full SDK and replayed after reconnection, which
 * would violate the no-silent-offline-replay rule. A transaction fails while offline
 * and reads the stable publication IDs first, so an uncertain acknowledgment is
 * resolved by read-back instead of a duplicate write.
 *
 * Emulator-safe by construction: the caller supplies the Firestore instance (tests connect
 * it to 127.0.0.1), this module holds no config, credentials, clock or retry queue.
 */
import {
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { PublicationPlan, Task, TransitionCommand, TransitionResult } from "./domain";
import { applyTransition, validateTask } from "./validation";

export const TASK_INPUT_KEYS = [
  "venueId",
  "handoverId",
  "creatorId",
  "title",
  "detail",
  "state",
  "ownerId",
  "version",
  "resolution",
] as const;

export type PublicationStatus = "created" | "existing";

export type PublicationRead =
  | { readonly status: "published"; readonly tasks: readonly Task[] }
  | { readonly status: "absent" }
  | { readonly status: "mismatch" };

/**
 * Persisted task minus timestamps, as the pure contract expects it. Values stay `unknown`
 * so `applyTransition` validates them instead of trusting this adapter.
 */
function taskInput(id: string, data: Record<string, unknown>): Record<string, unknown> {
  const input: Record<string, unknown> = { id };
  for (const key of TASK_INPUT_KEYS) {
    input[key] = data[key];
  }
  return input;
}

/** Validates a server-read task document at the UI boundary. */
export function taskFromData(id: string, data: Record<string, unknown>): Task {
  return validateTask(taskInput(id, data));
}

function samePublication(existing: Record<string, unknown>, plan: PublicationPlan): boolean {
  const taskIds = existing.taskIds;
  return (
    Array.isArray(taskIds) &&
    taskIds.length === plan.tasks.length &&
    plan.tasks.every((task, index) => taskIds[index] === task.id) &&
    existing.venueId === plan.handover.venueId &&
    existing.creatorId === plan.handover.creatorId
  );
}

function samePublishedTask(existing: Record<string, unknown>, planned: Task): boolean {
  // Published identity and reviewed content are immutable; state/owner/version may have
  // advanced after a successful publication, which must not turn a retry into a conflict.
  return (
    existing.id === planned.id &&
    existing.venueId === planned.venueId &&
    existing.handoverId === planned.handoverId &&
    existing.creatorId === planned.creatorId &&
    existing.title === planned.title &&
    existing.detail === planned.detail
  );
}

/**
 * Publishes the handover, tasks and creation activities in one transaction. If the same
 * stable IDs are already published, returns `existing` without writing, so a retry after
 * a lost acknowledgment cannot duplicate records. Offline, the transaction rejects; no
 * write is queued for later replay.
 */
export async function publishHandover(
  db: Firestore,
  plan: PublicationPlan,
): Promise<PublicationStatus> {
  const handoverRef = doc(db, "venues", plan.handover.venueId, "handovers", plan.handover.id);
  const taskRefs = plan.tasks.map((task) =>
    doc(db, "venues", task.venueId, "tasks", task.id),
  );
  const activityRefs = plan.activities.map((activity) =>
    doc(db, "venues", activity.venueId, "activities", activity.id),
  );

  return runTransaction(db, async (transaction) => {
    const handoverSnapshot = await transaction.get(handoverRef);
    if (handoverSnapshot.exists()) {
      if (!samePublication(handoverSnapshot.data(), plan)) {
        throw new Error("publication id conflict");
      }
      for (const [index, taskRef] of taskRefs.entries()) {
        const taskSnapshot = await transaction.get(taskRef);
        const planned = plan.tasks[index];
        if (!taskSnapshot.exists() || planned === undefined || !samePublishedTask(taskSnapshot.data(), planned)) {
          throw new Error("publication read-back mismatch");
        }
        const activitySnapshot = await transaction.get(activityRefs[index] as (typeof activityRefs)[number]);
        if (!activitySnapshot.exists()) {
          throw new Error("publication read-back mismatch");
        }
      }
      return "existing";
    }

    for (const [index, taskRef] of taskRefs.entries()) {
      if ((await transaction.get(taskRef)).exists()) {
        throw new Error("publication id conflict");
      }
      if ((await transaction.get(activityRefs[index] as (typeof activityRefs)[number])).exists()) {
        throw new Error("publication id conflict");
      }
    }

    transaction.set(handoverRef, {
      ...plan.handover,
      createdAt: serverTimestamp(),
    });
    for (const task of plan.tasks) {
      transaction.set(doc(db, "venues", task.venueId, "tasks", task.id), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const activity of plan.activities) {
      transaction.set(doc(db, "venues", activity.venueId, "activities", activity.id), {
        ...activity,
        at: serverTimestamp(),
      });
    }
    return "created";
  });
}

/** Server read-back for an uncertain acknowledgment. Never consults the local cache. */
export async function readPublication(
  db: Firestore,
  venueId: string,
  handoverId: string,
  expectedTaskIds: readonly string[],
): Promise<PublicationRead> {
  const handoverSnapshot = await getDocFromServer(
    doc(db, "venues", venueId, "handovers", handoverId),
  );
  if (!handoverSnapshot.exists()) {
    return { status: "absent" };
  }
  const handover = handoverSnapshot.data();
  const taskIds = handover.taskIds;
  if (
    handover.venueId !== venueId ||
    !Array.isArray(taskIds) ||
    taskIds.length !== expectedTaskIds.length ||
    expectedTaskIds.some((taskId, index) => taskIds[index] !== taskId)
  ) {
    return { status: "mismatch" };
  }

  const tasks: Task[] = [];
  for (const taskId of expectedTaskIds) {
    const snapshot = await getDocFromServer(doc(db, "venues", venueId, "tasks", taskId));
    if (!snapshot.exists()) {
      return { status: "mismatch" };
    }
    tasks.push(taskFromData(snapshot.id, snapshot.data() as Record<string, unknown>));
  }
  return { status: "published", tasks };
}

/**
 * Reads the current task (and the observation target) inside a transaction, applies the pure
 * transition, then writes the task change and its single activity together. A changed read
 * set aborts the transaction, so a stale `expectedVersion` never overwrites newer state.
 * Offline, the transaction rejects instead of queuing a replay.
 */
export async function runTaskTransition(
  db: Firestore,
  venueId: string,
  taskId: string,
  command: TransitionCommand,
): Promise<TransitionResult> {
  const taskRef = doc(db, "venues", venueId, "tasks", taskId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(taskRef);
    if (!snapshot.exists()) {
      throw new Error("task not found");
    }

    let target: Record<string, unknown> | null = null;
    if (command.action === "observe") {
      const targetSnapshot = await transaction.get(
        doc(db, "venues", venueId, "tasks", command.targetTaskId),
      );
      target = targetSnapshot.exists()
        ? taskInput(targetSnapshot.id, targetSnapshot.data() as Record<string, unknown>)
        : null;
    }

    const result = applyTransition(taskInput(taskId, snapshot.data() as Record<string, unknown>), command, target);
    transaction.update(taskRef, {
      state: result.task.state,
      ownerId: result.task.ownerId,
      version: result.task.version,
      resolution: result.task.resolution,
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, "venues", venueId, "activities", result.activity.id), {
      ...result.activity,
      at: serverTimestamp(),
    });
    return result;
  });
}
