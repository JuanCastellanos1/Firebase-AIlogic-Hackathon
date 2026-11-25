/**
 * Concurrency contract (AC09): exactly one accepted owner and one acceptance event
 * under a real race, and no stale write accepted. Local demo emulator only.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { serverTimestamp, type Firestore } from "firebase/firestore";
import { activityIdFor } from "../../src/domain";
import { runTaskTransition } from "../../src/tasks";
import {
  ACCEPTED_TASK,
  activityOf,
  baseSeed,
  client,
  closeClients,
  createEnvironment,
  INCOMING,
  INCOMING_TWO,
  OPEN_TASK,
  OPEN_TASK_TWO,
  OUTGOING,
  paths,
  readData,
  seed,
  VENUE,
  writeDocs,
} from "./support";

let env: RulesTestEnvironment;
let incoming: Firestore;
let incomingTwo: Firestore;
let outgoing: Firestore;

beforeAll(async () => {
  env = await createEnvironment();
  incoming = client(INCOMING);
  incomingTwo = client(INCOMING_TWO);
  outgoing = client(OUTGOING);
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, baseSeed());
});

afterAll(async () => {
  await env.cleanup();
  await closeClients();
});

function errorCode(reason: unknown): string {
  if (typeof reason === "object" && reason !== null && "code" in reason) {
    return String((reason as { code: unknown }).code);
  }
  return "";
}

describe("simultaneous accept", () => {
  it("grants exactly one owner, one version, and one acceptance event", async () => {
    const results = await Promise.allSettled([
      runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
        action: "accept",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 1,
      }),
      runTaskTransition(incomingTwo, VENUE, OPEN_TASK.id, {
        action: "accept",
        actorId: INCOMING_TWO,
        actorRole: "incoming",
        expectedVersion: 1,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(["stale_version", "forbidden_transition", "permission-denied"]).toContain(errorCode(rejected[0]?.reason));

    const task = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    expect(task).toMatchObject({ state: "accepted", version: 2 });
    expect([INCOMING, INCOMING_TWO]).toContain(task?.ownerId);

    const acceptance = await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)));
    expect(acceptance).toMatchObject({
      taskId: OPEN_TASK.id,
      action: "accept",
      fromState: "open",
      fromVersion: 1,
      toState: "accepted",
      toVersion: 2,
    });
    expect(acceptance?.actorId).toBe(task?.ownerId);
    expect(acceptance?.at).toEqual(task?.updatedAt);

    // No second event and no later version exists for this task.
    expect(await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 3)))).toBeNull();
    expect((await readData(incoming, paths.task(VENUE, OPEN_TASK_TWO.id)))?.state).toBe("open");
  });

  it("rejects a write built from a snapshot taken before the accepted version", async () => {
    const stale = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    expect(stale?.version).toBe(1);

    await runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });

    await assertFails(
      writeDocs(incomingTwo, [
        {
          path: paths.task(VENUE, OPEN_TASK.id),
          data: {
            ...stale,
            state: "accepted",
            ownerId: INCOMING_TWO,
            version: 2,
            resolution: null,
            updatedAt: serverTimestamp(),
          },
        },
        {
          path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
          data: activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
            actorId: INCOMING_TWO,
          }),
        },
      ]),
    );

    const task = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    expect(task?.ownerId).toBe(INCOMING);
    expect(task?.version).toBe(2);
  });
});

describe("stale observation targets", () => {
  it("rejects an observation whose target version moved (client read and Rules)", async () => {
    await runTaskTransition(incoming, VENUE, OPEN_TASK_TWO.id, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });

    // The adapter read the target inside its transaction, so it refuses before writing.
    await expect(
      runTaskTransition(outgoing, VENUE, OPEN_TASK.id, {
        action: "observe",
        actorId: OUTGOING,
        actorRole: "outgoing",
        expectedVersion: 1,
        kind: "duplicate",
        targetTaskId: OPEN_TASK_TWO.id,
        targetVersion: 1,
        rationale: "Same cable kit.",
      }),
    ).rejects.toMatchObject({ code: "stale_target" });

    // A forged direct write that skips the client check is denied by Rules too.
    const source = await readData(outgoing, paths.task(VENUE, OPEN_TASK.id));
    await assertFails(
      writeDocs(outgoing, [
        {
          path: paths.task(VENUE, OPEN_TASK.id),
          data: { ...source, version: 2, updatedAt: serverTimestamp() },
        },
        {
          path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
          data: activityOf(OPEN_TASK.id, "observe", { state: "open", version: 1 }, { state: "open", version: 2 }, {
            actorId: OUTGOING,
            observation: {
              kind: "duplicate",
              targetTaskId: OPEN_TASK_TWO.id,
              targetVersion: 1,
              rationale: "Same cable kit.",
            },
          }),
        },
      ]),
    );

    expect((await readData(outgoing, paths.task(VENUE, OPEN_TASK.id)))?.version).toBe(1);
    expect((await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id)))?.version).toBe(1);
  });

  it("denies an observation whose target is resolved in the same atomic batch", async () => {
    const source = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    const target = await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id));
    expect(target).toMatchObject({ state: "accepted", version: 1, ownerId: INCOMING });

    // The owner resolves the target and observes it in one batch. The observation names the
    // pre-batch target version, so after the commit it is stale even though every write agrees.
    await assertFails(
      writeDocs(incoming, [
        {
          path: paths.task(VENUE, ACCEPTED_TASK.id),
          data: {
            ...target,
            state: "resolved",
            version: 2,
            resolution: "Replaced before lock-up.",
            updatedAt: serverTimestamp(),
          },
        },
        {
          path: paths.activity(VENUE, activityIdFor(ACCEPTED_TASK.id, 2)),
          data: activityOf(
            ACCEPTED_TASK.id,
            "resolve",
            { state: "accepted", version: 1 },
            { state: "resolved", version: 2 },
            { actorId: INCOMING, resolution: "Replaced before lock-up." },
          ),
        },
        {
          path: paths.task(VENUE, OPEN_TASK.id),
          data: { ...source, version: 2, updatedAt: serverTimestamp() },
        },
        {
          path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
          data: activityOf(OPEN_TASK.id, "observe", { state: "open", version: 1 }, { state: "open", version: 2 }, {
            actorId: INCOMING,
            observation: {
              kind: "duplicate",
              targetTaskId: ACCEPTED_TASK.id,
              targetVersion: 1,
              rationale: "Same cable kit.",
            },
          }),
        },
      ]),
    );

    // Denied as a whole: neither the target nor the source moved.
    expect(await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id))).toMatchObject({
      state: "accepted",
      version: 1,
    });
    expect((await readData(incoming, paths.task(VENUE, OPEN_TASK.id)))?.version).toBe(1);
  });

  it("still records an observation whose target is unchanged", async () => {
    const result = await runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
      action: "observe",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
      kind: "contradiction",
      targetTaskId: ACCEPTED_TASK.id,
      targetVersion: 1,
      rationale: "The cupboard detail disagrees.",
    });

    expect(result.task).toMatchObject({ state: "open", ownerId: null, version: 2 });
    expect((await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id)))?.version).toBe(1);
  });

  it("accepts an observation against the target version committed in the same batch", async () => {
    const source = await readData(incoming, paths.task(VENUE, OPEN_TASK_TWO.id));
    const target = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));

    // Post-state validation, not a batch ban: the target is accepted at v2 in this batch and the
    // observation names that committed open/accepted version.
    await writeDocs(incoming, [
      {
        path: paths.task(VENUE, OPEN_TASK.id),
        data: { ...target, state: "accepted", ownerId: INCOMING, version: 2, updatedAt: serverTimestamp() },
      },
      {
        path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
        data: activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: INCOMING,
        }),
      },
      {
        path: paths.task(VENUE, OPEN_TASK_TWO.id),
        data: { ...source, version: 2, updatedAt: serverTimestamp() },
      },
      {
        path: paths.activity(VENUE, activityIdFor(OPEN_TASK_TWO.id, 2)),
        data: activityOf(
          OPEN_TASK_TWO.id,
          "observe",
          { state: "open", version: 1 },
          { state: "open", version: 2 },
          {
            actorId: INCOMING,
            observation: {
              kind: "contradiction",
              targetTaskId: OPEN_TASK.id,
              targetVersion: 2,
              rationale: "The accepted owner disagrees about the bulbs.",
            },
          },
        ),
      },
    ]);

    expect(await readData(incoming, paths.task(VENUE, OPEN_TASK.id))).toMatchObject({
      state: "accepted",
      version: 2,
      ownerId: INCOMING,
    });
    expect((await readData(incoming, paths.task(VENUE, OPEN_TASK_TWO.id)))?.version).toBe(2);
  });
});
