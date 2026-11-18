/**
 * Regression for B1: activity IDs are derived (`{taskId}__v{toVersion}`) and can exceed the
 * 64-character cap that applies to free-form task/venue/user IDs. The task cap stays 64, so
 * the derived ID is bounded by 83 characters at the safe-integer version ceiling.
 * Local demo emulator only.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { serverTimestamp, type Firestore } from "firebase/firestore";
import { activityIdFor, type ActivityRecord, type Handover, type Task } from "../../src/domain";
import { publishHandover, readPublication, runTaskTransition } from "../../src/tasks";
import { planPublication } from "../../src/validation";
import { expectCode, makeContext, makePacket, makeTask } from "../fixtures/handover";
import {
  activityDoc,
  baseSeed,
  client,
  closeClients,
  createEnvironment,
  handoverDoc,
  INCOMING,
  OUTGOING,
  paths,
  readData,
  seed,
  taskDoc,
  VENUE,
  writeDocs,
} from "./support";

let env: RulesTestEnvironment;
let incoming: Firestore;
let outgoing: Firestore;

beforeAll(async () => {
  env = await createEnvironment();
  incoming = client(INCOMING);
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

const longTaskId = "t" + "a".repeat(63);
const tooLongTaskId = "t" + "a".repeat(64);
const uuidTaskId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

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

describe("derived activity IDs over the free-form identifier cap", () => {
  it("publishes, accepts, resolves and reopens a 64-character task ID with matching events", async () => {
    const plan = planPublication(
      makePacket(),
      makeContext({ taskIds: [longTaskId, "task-d4e5f6", "task-g7h8i9"] }),
    );
    expect(await publishHandover(outgoing, plan)).toBe("created");

    expect(longTaskId).toHaveLength(64);
    const creation = await readData(outgoing, paths.activity(VENUE, activityIdFor(longTaskId, 1)));
    expect(creation).toMatchObject({ taskId: longTaskId, action: "create", toVersion: 1 });
    expect(activityIdFor(longTaskId, 1)).toHaveLength(68);

    await runTaskTransition(incoming, VENUE, longTaskId, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });
    await runTaskTransition(incoming, VENUE, longTaskId, {
      action: "resolve",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 2,
      resolution: "Done before lock-up.",
    });
    await runTaskTransition(incoming, VENUE, longTaskId, {
      action: "reopen",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 3,
      reason: "Mat is still damp.",
    });

    for (const [version, action] of [
      [2, "accept"],
      [3, "resolve"],
      [4, "reopen"],
    ] as const) {
      const event = await readData(outgoing, paths.activity(VENUE, activityIdFor(longTaskId, version)));
      expect(event).toMatchObject({ taskId: longTaskId, action, toVersion: version });
    }

    const readBack = await readPublication(outgoing, VENUE, plan.handover.id, plan.handover.taskIds);
    expect(readBack.status).toBe("published");
    expect(readBack.status === "published" ? readBack.tasks[0] : null).toMatchObject({
      id: longTaskId,
      state: "accepted",
      version: 4,
    });
  });

  it("accepts an 83-character derived ID at the safe-integer version ceiling", async () => {
    const ceilingTaskId = "c" + "b".repeat(63);
    const seededTask: Task = makeTask({ id: ceilingTaskId, version: 9_007_199_254_740_990 });
    const handover: Handover = {
      id: "handover-ceiling-1",
      venueId: VENUE,
      creatorId: OUTGOING,
      taskIds: [ceilingTaskId],
    };
    await seed(env, [
      { path: paths.handover(VENUE, handover.id), data: handoverDoc(handover) },
      { path: paths.task(VENUE, ceilingTaskId), data: taskDoc(seededTask) },
    ]);

    await runTaskTransition(incoming, VENUE, ceilingTaskId, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 9_007_199_254_740_990,
    });

    const id = activityIdFor(ceilingTaskId, 9_007_199_254_740_991);
    expect(id).toHaveLength(83);
    expect(await readData(outgoing, paths.activity(VENUE, id))).toMatchObject({
      taskId: ceilingTaskId,
      action: "accept",
      toVersion: 9_007_199_254_740_991,
    });
  });

  it("keeps normal UUID task IDs unchanged", async () => {
    const plan = planPublication(
      makePacket(),
      makeContext({ taskIds: [uuidTaskId, "task-d4e5f6", "task-g7h8i9"] }),
    );
    expect(await publishHandover(outgoing, plan)).toBe("created");
    await runTaskTransition(incoming, VENUE, uuidTaskId, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });
    expect(
      await readData(outgoing, paths.activity(VENUE, activityIdFor(uuidTaskId, 2))),
    ).toMatchObject({ taskId: uuidTaskId, action: "accept", toVersion: 2 });
  });

  it("rejects a 65-character task ID in the client", () => {
    expect(
      expectCode(() =>
        planPublication(makePacket(), makeContext({ taskIds: [tooLongTaskId, "task-d4e5f6", "task-g7h8i9"] })),
      ),
    ).toBe("invalid_identifier");
  });

  it("rejects a direct 65-character task publication at Rules", async () => {
    const task = makeTask({ id: tooLongTaskId });
    const handover: Handover = {
      id: "handover-65-1",
      venueId: VENUE,
      creatorId: OUTGOING,
      taskIds: [tooLongTaskId],
    };
    await assertFails(
      writeDocs(outgoing, [
        { path: paths.handover(VENUE, handover.id), data: { ...handover, createdAt: serverTimestamp() } },
        { path: paths.task(VENUE, tooLongTaskId), data: taskDoc(task, serverTimestamp()) },
        {
          path: paths.activity(VENUE, activityIdFor(tooLongTaskId, 1)),
          data: activityDoc(createActivity(task), serverTimestamp()),
        },
      ]),
    );
  });

  it("rejects forged activity IDs: wrong suffix, task or version", async () => {
    const task = makeTask({ id: "task-forge-1" });
    const handover: Handover = {
      id: "handover-forge-1",
      venueId: VENUE,
      creatorId: OUTGOING,
      taskIds: [task.id],
    };
    const base = [
      { path: paths.handover(VENUE, handover.id), data: { ...handover, createdAt: serverTimestamp() } },
      { path: paths.task(VENUE, task.id), data: taskDoc(task, serverTimestamp()) },
    ];
    const forged = [
      `${task.id}__x1`, // wrong suffix
      activityIdFor("task-other-1", 1), // wrong task
      activityIdFor(task.id, 2), // wrong version
    ];

    for (const id of forged) {
      const activity = { ...createActivity(task), id };
      await assertFails(
        writeDocs(outgoing, [
          ...base,
          { path: paths.activity(VENUE, id), data: activityDoc(activity, serverTimestamp()) },
        ]),
      );
    }
  });
});
