/**
 * Publication and offline semantics of the adapter (AC09/AC10): stable IDs, read-back
 * after a lost acknowledgment, and no queued transaction write while offline.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { activityIdFor } from "../../src/domain";
import { publishHandover, readPublication, runTaskTransition } from "../../src/tasks";
import { planPublication } from "../../src/validation";
import { makeContext, makePacket } from "../fixtures/handover";
import {
  baseSeed,
  client,
  closeClients,
  createEnvironment,
  INCOMING,
  OUTGOING,
  paths,
  readData,
  seed,
  VENUE,
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

const plan = () => planPublication(makePacket(), makeContext());

describe("publication stable IDs", () => {
  it("retries idempotently after a lost acknowledgment without duplicating records", async () => {
    expect(await publishHandover(outgoing, plan())).toBe("created");
    expect(await publishHandover(outgoing, plan())).toBe("existing");

    const handoverId = makeContext().handoverId;
    const handover = await readData(outgoing, paths.handover(VENUE, handoverId));
    expect(handover?.taskIds).toEqual(makeContext().taskIds);
    for (const taskId of makeContext().taskIds) {
      expect((await readData(outgoing, paths.task(VENUE, taskId)))?.version).toBe(1);
      expect(await readData(outgoing, paths.activity(VENUE, activityIdFor(taskId, 1)))).not.toBeNull();
      expect(await readData(outgoing, paths.activity(VENUE, activityIdFor(taskId, 2)))).toBeNull();
    }

    const readBack = await readPublication(outgoing, VENUE, handoverId, makeContext().taskIds);
    expect(readBack.status).toBe("published");
  });

  it("recognizes an already-published handover after a task advanced, without resetting it", async () => {
    expect(await publishHandover(outgoing, plan())).toBe("created");
    await runTaskTransition(incoming, VENUE, makeContext().taskIds[0] as string, {
      action: "accept",
      actorId: INCOMING,
      actorRole: "incoming",
      expectedVersion: 1,
    });
    expect(await publishHandover(outgoing, plan())).toBe("existing");
    const task = await readData(outgoing, paths.task(VENUE, makeContext().taskIds[0] as string));
    expect(task).toMatchObject({ state: "accepted", version: 2, ownerId: INCOMING });
  });

  it("refuses to reuse a handover ID with different reviewed content", async () => {
    expect(await publishHandover(outgoing, plan())).toBe("created");
    const conflicting = planPublication(
      { cards: [{ title: "Different content", detail: "" }] },
      makeContext({ taskIds: [makeContext().taskIds[0] as string] }),
    );
    await expect(publishHandover(outgoing, conflicting)).rejects.toThrow("publication id conflict");
    expect((await readData(outgoing, paths.handover(VENUE, makeContext().handoverId)))?.taskIds).toEqual(
      makeContext().taskIds,
    );
  });
});
