/**
 * Authorization contract against the local Firestore emulator (AC02/AC07 plus the
 * publication and byte-boundary parts of AC02). Negative cases use direct SDK writes,
 * so the evidence is Rules behavior, not the client validator.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { Handover, ObservationRecord, Task } from "../../src/domain";
import { activityIdFor } from "../../src/domain";
import { planPublication, validateReviewedPacket } from "../../src/validation";
import { publishHandover, runTaskTransition } from "../../src/tasks";
import {
  ascii,
  combining,
  makeContext,
  makePacket,
  makeTask,
  precomposed,
  supplementary,
} from "../fixtures/handover";
import {
  ACCEPTED_TASK,
  activityOf,
  baseSeed,
  client,
  closeClients,
  createEnvironment,
  handoverDoc,
  INCOMING,
  INCOMING_TWO,
  NONMEMBER,
  OPEN_TASK,
  OPEN_TASK_TWO,
  OTHER_VENUE,
  OTHER_VENUE_TASK,
  OUTGOING,
  paths,
  publicationOps,
  readData,
  RESOLVED_TASK,
  SEED_HANDOVER,
  seed,
  taskDoc,
  VENUE,
  writeDocs,
  type SeedDoc,
} from "./support";

let env: RulesTestEnvironment;
let outgoing: Firestore;
let incoming: Firestore;
let incomingTwo: Firestore;
let nonmember: Firestore;
let anonymous: Firestore;

const memberTasks = () => collection(incoming, `venues/${VENUE}/tasks`);

interface Forge {
  readonly task?: Record<string, unknown>;
  readonly activity?: Record<string, unknown>;
  readonly handover?: Record<string, unknown>;
  readonly taskId?: string;
  readonly handoverId?: string;
}

/** One-card publication whose every part can be forged, dropped by the caller, or edited. */
function rawOneCard(forge: Forge = {}): SeedDoc[] {
  const taskId = forge.taskId ?? "task-raw-1";
  const handoverId = forge.handoverId ?? "handover-raw-1";
  const task: Task = {
    id: taskId,
    venueId: VENUE,
    handoverId,
    creatorId: OUTGOING,
    title: "Raw card",
    detail: "",
    state: "open",
    ownerId: null,
    version: 1,
    resolution: null,
  };
  const handover: Handover = { id: handoverId, venueId: VENUE, creatorId: OUTGOING, taskIds: [taskId] };
  const activity = activityOf(taskId, "create", null, { state: "open", version: 1 }, { actorId: OUTGOING });
  return [
    {
      path: paths.handover(VENUE, handoverId),
      data: { ...handoverDoc(handover, serverTimestamp()), ...forge.handover },
    },
    {
      path: paths.task(VENUE, taskId),
      data: { ...taskDoc(task, serverTimestamp()), ...forge.task },
    },
    {
      path: paths.activity(VENUE, String(activity.id)),
      data: { ...activity, ...forge.activity },
    },
  ];
}

function cardPacket(count: number, prefix: string) {
  return { cards: Array.from({ length: count }, (_, index) => ({ title: `${prefix} ${index + 1}`, detail: `Detail ${index + 1}` })) };
}

async function attemptTransition(
  reader: Firestore,
  writer: Firestore,
  taskId: string,
  nextTask: Record<string, unknown>,
  activity: Record<string, unknown>,
) {
  const previous = await readData(reader, paths.task(VENUE, taskId));
  const next = { ...previous, ...nextTask, updatedAt: serverTimestamp() };
  return writeDocs(writer, [
    { path: paths.task(VENUE, taskId), data: next },
    { path: paths.activity(VENUE, String(activity.id)), data: activity },
  ]);
}

beforeAll(async () => {
  env = await createEnvironment();
  outgoing = client(OUTGOING);
  incoming = client(INCOMING);
  incomingTwo = client(INCOMING_TWO);
  nonmember = client(NONMEMBER);
  anonymous = client(null);
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, baseSeed());
});

afterAll(async () => {
  await env.cleanup();
  await closeClients();
});

describe("identity and membership boundary", () => {
  it("denies every shared read without authentication", async () => {
    await assertFails(getDoc(doc(anonymous, paths.task(VENUE, OPEN_TASK.id))));
    await assertFails(getDoc(doc(anonymous, paths.handover(VENUE, SEED_HANDOVER.id))));
    await assertFails(getDoc(doc(anonymous, paths.member(VENUE, OUTGOING))));
    await assertFails(getDocs(query(collection(anonymous, `venues/${VENUE}/tasks`), limit(10))));
  });

  it("denies a nonmember every read and write in the venue", async () => {
    await assertFails(getDoc(doc(nonmember, paths.task(VENUE, OPEN_TASK.id))));
    await assertFails(getDocs(query(collection(nonmember, `venues/${VENUE}/tasks`), limit(10))));
    await assertFails(getDoc(doc(nonmember, paths.member(VENUE, OUTGOING))));
    await assertFails(setDoc(doc(nonmember, paths.task(VENUE, "task-nm-1")), taskDoc(OPEN_TASK)));
  });

  it("lets a member read shared records and a bounded venue-scoped query", async () => {
    await assertSucceeds(getDoc(doc(incoming, paths.task(VENUE, OPEN_TASK.id))));
    await assertSucceeds(getDoc(doc(incoming, paths.handover(VENUE, SEED_HANDOVER.id))));
    const snapshot = await assertSucceeds(
      getDocs(query(memberTasks(), where("state", "==", "open"), orderBy("createdAt"), limit(20))),
    );
    expect(snapshot.docs.map((entry) => entry.id).sort()).toEqual([OPEN_TASK.id, OPEN_TASK_TWO.id].sort());
  });

  it("denies unbounded and oversized list queries", async () => {
    await assertFails(getDocs(query(memberTasks(), where("state", "==", "open"))));
    await assertFails(getDocs(query(memberTasks(), where("state", "==", "open"), limit(51))));
  });

  it("allows reading only the caller's own membership document", async () => {
    await assertSucceeds(getDoc(doc(incoming, paths.member(VENUE, INCOMING))));
    await assertFails(getDoc(doc(incoming, paths.member(VENUE, INCOMING_TWO))));
    await assertFails(getDoc(doc(incoming, paths.member(VENUE, OUTGOING))));
    await assertFails(getDocs(query(collection(incoming, `venues/${VENUE}/members`), limit(10))));
  });

  it("denies a member of one venue every cross-venue access", async () => {
    await assertFails(getDoc(doc(outgoing, paths.task(OTHER_VENUE, OTHER_VENUE_TASK.id))));
    await assertFails(getDocs(query(collection(outgoing, `venues/${OTHER_VENUE}/tasks`), limit(10))));
    await assertFails(setDoc(doc(outgoing, paths.task(OTHER_VENUE, "task-xv-1")), taskDoc(OTHER_VENUE_TASK)));
    await assertFails(getDoc(doc(nonmember, paths.task(OTHER_VENUE, OTHER_VENUE_TASK.id))));
  });

  it("requires the membership record to name this venue and a declared role", async () => {
    // Another venue, a dropped venueId, an undeclared role, and another uid are all refused.
    const invalid: Record<string, unknown>[] = [
      { uid: INCOMING_TWO, venueId: OTHER_VENUE, role: "incoming" },
      { uid: INCOMING_TWO, role: "incoming" },
      { uid: INCOMING_TWO, venueId: VENUE, role: "admin" },
      { uid: INCOMING, venueId: VENUE, role: "incoming" },
    ];
    for (const data of invalid) {
      await env.clearFirestore();
      await seed(env, baseSeed());
      await seed(env, [{ path: paths.member(VENUE, INCOMING_TWO), data }]);
      await assertFails(getDoc(doc(incomingTwo, paths.task(VENUE, OPEN_TASK.id))));
      await assertFails(
        getDocs(query(collection(incomingTwo, `venues/${VENUE}/tasks`), limit(10)))
      );
      const previous = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
      await assertFails(
        writeDocs(incomingTwo, [
          {
            path: paths.task(VENUE, OPEN_TASK.id),
            data: {
              ...previous,
              state: "open",
              ownerId: null,
              version: 2,
              resolution: null,
              updatedAt: serverTimestamp(),
            },
          },
          {
            path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
            data: activityOf(
              OPEN_TASK.id,
              "observe",
              { state: "open", version: 1 },
              { state: "open", version: 2 },
              {
                actorId: INCOMING_TWO,
                observation: {
                  kind: "duplicate",
                  targetTaskId: ACCEPTED_TASK.id,
                  targetVersion: 1,
                  rationale: "Related work.",
                },
              },
            ),
          },
        ]),
      );
    }
    // The same identity with the correct venue and declared role keeps its shared access.
    await env.clearFirestore();
    await seed(env, baseSeed());
    await assertSucceeds(getDoc(doc(incomingTwo, paths.task(VENUE, OPEN_TASK.id))));
  });

  it("never lets a client create, update, or delete membership (no role escalation)", async () => {
    await assertFails(
      setDoc(doc(outgoing, paths.member(VENUE, NONMEMBER)), {
        uid: NONMEMBER,
        venueId: VENUE,
        role: "incoming",
      }),
    );
    await assertFails(updateDoc(doc(incoming, paths.member(VENUE, INCOMING)), { role: "outgoing" }));
    await assertFails(setDoc(doc(incoming, paths.member(VENUE, INCOMING)), {
      uid: INCOMING,
      venueId: VENUE,
      role: "outgoing",
    }));
    await assertFails(deleteDoc(doc(incoming, paths.member(VENUE, INCOMING))));
    await assertFails(deleteDoc(doc(outgoing, paths.member(VENUE, INCOMING_TWO))));
  });
});

describe("atomic publication", () => {
  it("publishes 1 through 5 cards as one batch with tasks and creation activities", async () => {
    for (const count of [1, 2, 3, 4, 5]) {
      const taskIds = Array.from({ length: count }, (_, index) => `task-pub-${count}-${index + 1}`);
      const plan = planPublication(cardPacket(count, `Card ${count}`), {
        venueId: VENUE,
        handoverId: `handover-pub-${count}`,
        creatorId: OUTGOING,
        taskIds,
      });
      await assertSucceeds(publishHandover(outgoing, plan));

      const handover = await readData(outgoing, paths.handover(VENUE, `handover-pub-${count}`));
      expect(handover?.taskIds).toEqual(taskIds);

      for (const [index, taskId] of taskIds.entries()) {
        const task = await readData(outgoing, paths.task(VENUE, taskId));
        expect(task).toMatchObject({
          id: taskId,
          venueId: VENUE,
          handoverId: `handover-pub-${count}`,
          creatorId: OUTGOING,
          title: `Card ${count} ${index + 1}`,
          state: "open",
          ownerId: null,
          version: 1,
          resolution: null,
        });
        expect(task?.createdAt).toBeInstanceOf(Timestamp);
        expect(task?.updatedAt).toEqual(task?.createdAt);

        const activity = await readData(outgoing, paths.activity(VENUE, activityIdFor(taskId, 1)));
        expect(activity).toMatchObject({
          id: activityIdFor(taskId, 1),
          taskId,
          venueId: VENUE,
          actorId: OUTGOING,
          action: "create",
          fromState: null,
          fromVersion: null,
          toState: "open",
          toVersion: 1,
          resolution: null,
          reason: null,
          observation: null,
        });
        expect(activity?.at).toEqual(task?.createdAt);
      }
    }
  });

  it("denies publication by an incoming member, a nonmember, and a signed-out client", async () => {
    const plan = planPublication(makePacket(), makeContext());
    await assertFails(publishHandover(incoming, plan));
    await assertFails(publishHandover(nonmember, plan));
    await assertFails(publishHandover(anonymous, plan));
  });

  it("denies partial publication: handover without tasks, task without handover, missing activity", async () => {
    const plan = planPublication(cardPacket(2, "Partial"), {
      venueId: VENUE,
      handoverId: "handover-partial",
      creatorId: OUTGOING,
      taskIds: ["task-partial-1", "task-partial-2"],
    });
    const ops = publicationOps(plan);
    const withoutTask = ops.filter((entry) => !entry.path.endsWith("task-partial-2"));
    await assertFails(writeDocs(outgoing, withoutTask));

    const withoutHandover = ops.filter((entry) => !entry.path.includes("/handovers/"));
    await assertFails(writeDocs(outgoing, withoutHandover));

    const withoutActivity = ops.filter((entry) => !entry.path.includes("/activities/"));
    await assertFails(writeDocs(outgoing, withoutActivity));

    const withoutTaskOne = ops.filter((entry) => !entry.path.endsWith("task-partial-1"));
    await assertFails(writeDocs(outgoing, withoutTaskOne));
  });

  it("denies forged linkage: task missing from handover, wrong handover id, wrong creator", async () => {
    const wrongTaskId = rawOneCard({ handover: { taskIds: ["task-raw-other"] } });
    await assertFails(writeDocs(outgoing, wrongTaskId));

    const wrongHandover = rawOneCard({ task: { handoverId: "handover-other-9" } });
    await assertFails(writeDocs(outgoing, wrongHandover));

    const wrongCreator = rawOneCard({ task: { creatorId: INCOMING } });
    await assertFails(writeDocs(outgoing, wrongCreator));

    const handoverForOtherCreator = rawOneCard({ handover: { creatorId: INCOMING } });
    await assertFails(writeDocs(outgoing, handoverForOtherCreator));
  });

  it("denies six cards, unknown keys, and handover task-list bounds", async () => {
    const tooMany = planPublication(cardPacket(5, "Six"), {
      venueId: VENUE,
      handoverId: "handover-six",
      creatorId: OUTGOING,
      taskIds: ["task-six-1", "task-six-2", "task-six-3", "task-six-4", "task-six-5"],
    });
    const ops = publicationOps(tooMany);
    const extraTask: SeedDoc = {
      path: paths.task(VENUE, "task-six-6"),
      data: taskDoc({
        ...OPEN_TASK,
        id: "task-six-6",
        handoverId: "handover-six",
        title: "Six 6",
        detail: "Detail 6",
      }),
    };
    const extraActivity: SeedDoc = {
      path: paths.activity(VENUE, activityIdFor("task-six-6", 1)),
      data: activityOf("task-six-6", "create", null, { state: "open", version: 1 }, { actorId: OUTGOING }),
    };
    const sixCards: SeedDoc[] = [
      ...ops.map((entry) =>
        entry.path.includes("/handovers/")
          ? {
              ...entry,
              data: {
                ...entry.data,
                taskIds: ["task-six-1", "task-six-2", "task-six-3", "task-six-4", "task-six-5", "task-six-6"],
              },
            }
          : entry,
      ),
      extraTask,
      extraActivity,
    ];
    await assertFails(writeDocs(outgoing, sixCards));

    const emptyTaskIds = rawOneCard({ handover: { taskIds: [] } });
    await assertFails(writeDocs(outgoing, emptyTaskIds));

    const unknownKey = rawOneCard({ task: { privateNote: "must not persist" } });
    await assertFails(writeDocs(outgoing, unknownKey));

    const forgedTimestamp = rawOneCard({ task: { createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")) } });
    await assertFails(writeDocs(outgoing, forgedTimestamp));

    const wrongHandoverId = rawOneCard({ handover: { id: "handover-mismatch" } });
    await assertFails(writeDocs(outgoing, wrongHandoverId));
  });
});

describe("allowed transitions", () => {
  it("accepts, resolves, and reopens as the incoming owner with one activity per version", async () => {
    const accepted = await assertSucceeds(
      runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
        action: "accept",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 1,
      }),
    );
    expect(accepted.task).toMatchObject({ state: "accepted", ownerId: INCOMING, version: 2 });
    const afterAccept = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    expect(afterAccept).toMatchObject({ state: "accepted", ownerId: INCOMING, version: 2 });
    const acceptEvent = await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)));
    expect(acceptEvent).toMatchObject({
      action: "accept",
      actorId: INCOMING,
      fromState: "open",
      fromVersion: 1,
      toState: "accepted",
      toVersion: 2,
      resolution: null,
      reason: null,
      observation: null,
    });
    expect(acceptEvent?.at).toEqual(afterAccept?.updatedAt);

    const resolved = await assertSucceeds(
      runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
        action: "resolve",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 2,
        resolution: "Replaced both bulbs.",
      }),
    );
    expect(resolved.task).toMatchObject({ state: "resolved", ownerId: INCOMING, version: 3, resolution: "Replaced both bulbs." });
    const resolveEvent = await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 3)));
    expect(resolveEvent).toMatchObject({
      action: "resolve",
      fromState: "accepted",
      fromVersion: 2,
      toState: "resolved",
      toVersion: 3,
      resolution: "Replaced both bulbs.",
      reason: null,
    });

    const reopened = await assertSucceeds(
      runTaskTransition(incoming, VENUE, OPEN_TASK.id, {
        action: "reopen",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 3,
        reason: "One bulb failed again.",
      }),
    );
    expect(reopened.task).toMatchObject({ state: "accepted", ownerId: INCOMING, version: 4, resolution: null });
    const reopenEvent = await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 4)));
    expect(reopenEvent).toMatchObject({
      action: "reopen",
      fromState: "resolved",
      fromVersion: 3,
      toState: "accepted",
      toVersion: 4,
      resolution: null,
      reason: "One bulb failed again.",
      observation: null,
    });

    // History is retained: the earlier resolve event still carries its resolution text.
    expect((await readData(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 3))))?.resolution).toBe(
      "Replaced both bulbs.",
    );
  });

  it("records an observation from either role without changing state or ownership", async () => {
    const result = await assertSucceeds(
      runTaskTransition(outgoing, VENUE, OPEN_TASK.id, {
        action: "observe",
        actorId: OUTGOING,
        actorRole: "outgoing",
        expectedVersion: 1,
        kind: "duplicate",
        targetTaskId: ACCEPTED_TASK.id,
        targetVersion: 1,
        rationale: "Same cable kit as the accepted task.",
      }),
    );
    expect(result.task).toMatchObject({ state: "open", ownerId: null, version: 2 });
    const event = await readData(outgoing, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)));
    expect(event).toMatchObject({
      action: "observe",
      actorId: OUTGOING,
      fromState: "open",
      fromVersion: 1,
      toState: "open",
      toVersion: 2,
      resolution: null,
      reason: null,
      observation: {
        kind: "duplicate",
        targetTaskId: ACCEPTED_TASK.id,
        targetVersion: 1,
        rationale: "Same cable kit as the accepted task.",
      },
    });

    await assertSucceeds(
      runTaskTransition(incoming, VENUE, OPEN_TASK_TWO.id, {
        action: "observe",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 1,
        kind: "contradiction",
        targetTaskId: ACCEPTED_TASK.id,
        targetVersion: 1,
        rationale: "Details disagree about the cupboard.",
      }),
    );
  });
});

describe("denied transitions through direct SDK writes", () => {
  it("denies outgoing acceptance and self-assignment", async () => {
    await assertFails(
      attemptTransition(
        incoming,
        outgoing,
        OPEN_TASK.id,
        { state: "accepted", ownerId: OUTGOING, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: OUTGOING,
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING_TWO, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: INCOMING,
        }),
      ),
    );
  });

  it("denies accepting an accepted task, resolving an open task, and reopening an accepted task", async () => {
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "accepted", ownerId: INCOMING_TWO, version: 2, resolution: null },
        activityOf(ACCEPTED_TASK.id, "accept", { state: "accepted", version: 1 }, { state: "accepted", version: 2 }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "resolved", ownerId: INCOMING, version: 2, resolution: "done" },
        activityOf(OPEN_TASK.id, "resolve", { state: "open", version: 1 }, { state: "resolved", version: 2 }, {
          resolution: "done",
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(ACCEPTED_TASK.id, "reopen", { state: "accepted", version: 1 }, { state: "accepted", version: 2 }, {
          reason: "nope",
        }),
      ),
    );
  });

  it("denies resolving or reopening someone else's task and owner replacement or release", async () => {
    await assertFails(
      attemptTransition(
        incoming,
        incomingTwo,
        ACCEPTED_TASK.id,
        { state: "resolved", ownerId: INCOMING, version: 2, resolution: "not mine" },
        activityOf(ACCEPTED_TASK.id, "resolve", { state: "accepted", version: 1 }, { state: "resolved", version: 2 }, {
          actorId: INCOMING_TWO,
          resolution: "not mine",
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incomingTwo,
        RESOLVED_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(RESOLVED_TASK.id, "reopen", { state: "resolved", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: INCOMING_TWO,
          reason: "not mine",
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "accepted", ownerId: null, version: 2, resolution: null },
        activityOf(ACCEPTED_TASK.id, "accept", { state: "accepted", version: 1 }, { state: "accepted", version: 2 }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incomingTwo,
        ACCEPTED_TASK.id,
        { state: "accepted", ownerId: INCOMING_TWO, version: 2, resolution: null },
        activityOf(ACCEPTED_TASK.id, "accept", { state: "accepted", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: INCOMING_TWO,
        }),
      ),
    );
  });

  it("denies arbitrary state patches, version jumps, content edits, and deletes", async () => {
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "resolved", ownerId: INCOMING, version: 2, resolution: "patched" },
        activityOf(OPEN_TASK.id, "resolve", { state: "open", version: 1 }, { state: "resolved", version: 2 }, {
          resolution: "patched",
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 3, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 3 }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        {
          state: "accepted",
          ownerId: INCOMING,
          version: 2,
          resolution: null,
          title: "Rewritten after publication",
        },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: "smuggled" },
        activityOf(ACCEPTED_TASK.id, "accept", { state: "accepted", version: 1 }, { state: "accepted", version: 2 }),
      ),
    );
    await assertFails(deleteDoc(doc(incoming, paths.task(VENUE, OPEN_TASK.id))));
    await assertFails(deleteDoc(doc(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 1)))));
    await assertFails(deleteDoc(doc(incoming, paths.handover(VENUE, SEED_HANDOVER.id))));
  });

  it("denies a version above the safe-integer ceiling", async () => {
    const maxTask = makeTask({ id: "task-max-1", version: 9007199254740991 });
    await seed(env, [{ path: paths.task(VENUE, maxTask.id), data: taskDoc(maxTask) }]);
    const previous = await readData(incoming, paths.task(VENUE, maxTask.id));
    await assertFails(
      writeDocs(incoming, [
        {
          path: paths.task(VENUE, maxTask.id),
          data: {
            ...previous,
            state: "accepted",
            ownerId: INCOMING,
            version: 9007199254740992,
            resolution: null,
            updatedAt: serverTimestamp(),
          },
        },
        {
          path: paths.activity(VENUE, activityIdFor(maxTask.id, 9007199254740992)),
          data: activityOf(
            maxTask.id,
            "accept",
            { state: "open", version: 9007199254740991 },
            { state: "accepted", version: 9007199254740992 },
            { actorId: INCOMING },
          ),
        },
      ]),
    );
  });

  it("denies forged, omitted, edited, and standalone activities", async () => {
    // Standalone accept event: the task is not written in the same request.
    await assertFails(
      writeDocs(incoming, [
        {
          path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
          data: activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
            actorId: INCOMING,
          }),
        },
      ]),
    );
    // Task update without its activity.
    const previous = await readData(incoming, paths.task(VENUE, OPEN_TASK.id));
    await assertFails(
      writeDocs(incoming, [
        {
          path: paths.task(VENUE, OPEN_TASK.id),
          data: {
            ...previous,
            state: "accepted",
            ownerId: INCOMING,
            version: 2,
            resolution: null,
            updatedAt: serverTimestamp(),
          },
        },
      ]),
    );
    // Activity whose actor is not the authenticated caller.
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          actorId: OUTGOING,
        }),
      ),
    );
    // Activity for a version the task does not reach.
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 3 }),
      ),
    );
    // Activity ID not derived from task and version.
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          id: "forged-activity-id",
        }),
      ),
    );
    // Client-supplied event time instead of server time.
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }, {
          at: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
        }),
      ),
    );
    // Client-supplied task update time instead of server time.
    await assertFails(
      writeDocs(incoming, [
        {
          path: paths.task(VENUE, OPEN_TASK.id),
          data: {
            ...previous,
            state: "accepted",
            ownerId: INCOMING,
            version: 2,
            resolution: null,
            updatedAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
          },
        },
        {
          path: paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 2)),
          data: activityOf(OPEN_TASK.id, "accept", { state: "open", version: 1 }, { state: "accepted", version: 2 }),
        },
      ]),
    );
    // Activities are append-only.
    await assertFails(
      updateDoc(doc(incoming, paths.activity(VENUE, activityIdFor(OPEN_TASK.id, 1))), { action: "observe" }),
    );
  });

  it("denies observation against a mismatched, missing, self, resolved, or cross-venue target", async () => {
    const observe = (payload: ObservationRecord) =>
      attemptTransition(
        incoming,
        incoming,
        OPEN_TASK.id,
        { state: "open", ownerId: null, version: 2, resolution: null },
        activityOf(OPEN_TASK.id, "observe", { state: "open", version: 1 }, { state: "open", version: 2 }, {
          actorId: INCOMING,
          observation: payload,
        }),
      );
    const observation = (
      targetTaskId: string,
      targetVersion: number,
      rationale = "Related work.",
    ): ObservationRecord => ({ kind: "duplicate", targetTaskId, targetVersion, rationale });

    // Target version moved: the recorded v1 target is stale once the target is accepted (v2).
    await runTaskTransition(incoming, VENUE, OPEN_TASK_TWO.id, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });
    await assertFails(observe(observation(OPEN_TASK_TWO.id, 1)));
    await assertFails(observe(observation("task-missing-9", 1)));
    await assertFails(observe(observation(OPEN_TASK.id, 1)));
    await assertFails(observe(observation(RESOLVED_TASK.id, 1)));
    await assertFails(observe(observation(OTHER_VENUE_TASK.id, 1)));
    await assertFails(observe({ ...observation(ACCEPTED_TASK.id, 1), rationale: "x".repeat(401) }));
    await assertFails(observe(observation(ACCEPTED_TASK.id, 0)));
  });
});

describe("UTF-8 byte boundaries agree between client validation and Rules", () => {
  interface Boundary {
    readonly name: string;
    readonly at: string;
    readonly over: string;
  }

  const titleBoundaries: readonly Boundary[] = [
    { name: "ascii", at: ascii(120), over: ascii(121) },
    { name: "supplementary", at: supplementary(30), over: supplementary(31) },
    { name: "combining", at: combining(40), over: combining(41) },
    { name: "precomposed", at: precomposed(60), over: precomposed(61) },
    {
      name: "mixed",
      at: `${precomposed(20)}${supplementary(15)}${ascii(20)}`,
      over: `${precomposed(20)}${supplementary(15)}${ascii(21)}`,
    },
  ];

  const detailBoundaries: readonly Boundary[] = [
    { name: "ascii", at: ascii(800), over: ascii(801) },
    { name: "supplementary", at: supplementary(200), over: supplementary(201) },
    {
      name: "mixed",
      at: `${precomposed(100)}${supplementary(100)}${ascii(200)}`,
      over: `${precomposed(100)}${supplementary(100)}${ascii(201)}`,
    },
  ];

  const clientAccepts = (title: string, detail: string): boolean => {
    try {
      validateReviewedPacket({ cards: [{ title, detail }] });
      return true;
    } catch {
      return false;
    }
  };

  let counter = 0;
  const publishDirect = async (title: string, detail: string): Promise<boolean> => {
    counter += 1;
    const suffix = `bd-${counter}`;
    try {
      await writeDocs(
        outgoing,
        rawOneCard({
          taskId: `task-${suffix}`,
          handoverId: `handover-${suffix}`,
          task: { title, detail },
        }),
      );
      return true;
    } catch {
      return false;
    }
  };

  it("accepts at the title cap and reads the exact string back", async () => {
    for (const boundary of titleBoundaries) {
      const packet = { cards: [{ title: boundary.at, detail: "" }] };
      const plan = planPublication(packet, {
        venueId: VENUE,
        handoverId: `handover-at-${boundary.name}`,
        creatorId: OUTGOING,
        taskIds: [`task-at-${boundary.name}`],
      });
      await assertSucceeds(publishHandover(outgoing, plan));
      const stored = await readData(outgoing, paths.task(VENUE, `task-at-${boundary.name}`));
      expect(stored?.title).toBe(boundary.at);
      expect(clientAccepts(boundary.at, "")).toBe(true);
    }
  });

  it("denies one byte over the title cap in both client and Rules", async () => {
    for (const boundary of titleBoundaries) {
      expect(clientAccepts(boundary.over, "")).toBe(false);
      expect(await publishDirect(boundary.over, "")).toBe(false);
    }
  });

  it("applies the same byte contract to detail and keeps exact read-back", async () => {
    for (const boundary of detailBoundaries) {
      const packet = { cards: [{ title: "Detail boundary", detail: boundary.at }] };
      const plan = planPublication(packet, {
        venueId: VENUE,
        handoverId: `handover-detail-${boundary.name}`,
        creatorId: OUTGOING,
        taskIds: [`task-detail-${boundary.name}`],
      });
      await assertSucceeds(publishHandover(outgoing, plan));
      const stored = await readData(outgoing, paths.task(VENUE, `task-detail-${boundary.name}`));
      expect(stored?.detail).toBe(boundary.at);
      expect(clientAccepts("Detail boundary", boundary.at)).toBe(true);

      expect(clientAccepts("Detail boundary", boundary.over)).toBe(false);
      expect(await publishDirect("Detail boundary", boundary.over)).toBe(false);
    }
  });

  it("enforces the resolution and reopen-reason byte caps", async () => {
    const resolveAtCap = await assertSucceeds(
      runTaskTransition(incoming, VENUE, ACCEPTED_TASK.id, {
        action: "resolve",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 1,
        resolution: precomposed(400),
      }),
    );
    expect(resolveAtCap.task.resolution).toBe(precomposed(400));
    const stored = await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id));
    expect(stored?.resolution).toBe(precomposed(400));

    const reopenAtCap = await assertSucceeds(
      runTaskTransition(incoming, VENUE, ACCEPTED_TASK.id, {
        action: "reopen",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 2,
        reason: ascii(400),
      }),
    );
    expect(reopenAtCap.task.resolution).toBeNull();

    const previous = await readData(incoming, paths.task(VENUE, ACCEPTED_TASK.id));
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "resolved", ownerId: INCOMING, version: 4, resolution: precomposed(401) },
        activityOf(ACCEPTED_TASK.id, "resolve", { state: "accepted", version: 3 }, { state: "resolved", version: 4 }, {
          resolution: precomposed(401),
        }),
      ),
    );
    expect(previous?.version).toBe(3);

    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        ACCEPTED_TASK.id,
        { state: "resolved", ownerId: INCOMING, version: 4, resolution: "   " },
        activityOf(ACCEPTED_TASK.id, "resolve", { state: "accepted", version: 3 }, { state: "resolved", version: 4 }, {
          resolution: "   ",
        }),
      ),
    );

    // Reopen reason: 400 bytes pass, 401 and blank fail.
    const reopened = await assertSucceeds(
      runTaskTransition(incoming, VENUE, RESOLVED_TASK.id, {
        action: "reopen",
        actorId: INCOMING,
        actorRole: "incoming",
        expectedVersion: 1,
        reason: ascii(400),
      }),
    );
    expect(reopened.task).toMatchObject({ state: "accepted", version: 2 });
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        RESOLVED_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 3, resolution: null },
        activityOf(RESOLVED_TASK.id, "reopen", { state: "resolved", version: 2 }, { state: "accepted", version: 3 }, {
          reason: ascii(401),
        }),
      ),
    );
    await assertFails(
      attemptTransition(
        incoming,
        incoming,
        RESOLVED_TASK.id,
        { state: "accepted", ownerId: INCOMING, version: 3, resolution: null },
        activityOf(RESOLVED_TASK.id, "reopen", { state: "resolved", version: 2 }, { state: "accepted", version: 3 }, {
          reason: "   ",
        }),
      ),
    );
  });
});
