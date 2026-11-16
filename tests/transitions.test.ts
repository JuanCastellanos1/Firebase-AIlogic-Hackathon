import { describe, expect, it } from "vitest";
import contrato from "./fixtures/contrato.json";
import { activityIdFor, type Task } from "../src/domain";
import { applyTransition, planPublication } from "../src/validation";
import {
  ascii,
  combining,
  expectCode,
  makeContext,
  makePacket,
  makeTask,
  supplementary,
} from "./fixtures/handover";

const ACTOR = "incoming-sam";
const OUTGOING = "outgoing-robin";

function acceptCommand(expectedVersion = 1) {
  return { action: "accept", actorId: ACTOR, actorRole: "incoming", expectedVersion };
}

describe("planPublication", () => {
  it("creates open unassigned version 1 tasks with one creation activity each", () => {
    const packet = makePacket();
    const plan = planPublication(packet, makeContext());
    expect(plan.tasks).toHaveLength(3);
    for (const [index, task] of plan.tasks.entries()) {
      expect(task.state).toBe("open");
      expect(task.ownerId).toBeNull();
      expect(task.version).toBe(1);
      expect(task.resolution).toBeNull();
      expect(task.venueId).toBe("venue-hall-01");
      expect(task.handoverId).toBe("handover-0001");
      expect(task.creatorId).toBe(OUTGOING);
      expect(task.title).toBe(packet.cards[index]?.title);
      expect(task.id).toBe(makeContext().taskIds[index]);
    }
    expect(plan.handover).toEqual({
      id: "handover-0001",
      venueId: "venue-hall-01",
      creatorId: OUTGOING,
      taskIds: makeContext().taskIds,
    });
    expect(plan.activities).toHaveLength(3);
    for (const [index, activity] of plan.activities.entries()) {
      const task = plan.tasks[index];
      expect(activity.id).toBe(activityIdFor(task!.id, 1));
      expect(activity.action).toBe("create");
      expect(activity.fromState).toBeNull();
      expect(activity.toState).toBe("open");
      expect(activity.fromVersion).toBeNull();
      expect(activity.toVersion).toBe(1);
      expect(activity.actorId).toBe(OUTGOING);
      expect(activity.resolution).toBeNull();
      expect(activity.reason).toBeNull();
      expect(activity.observation).toBeNull();
    }
  });

  it("accepts five cards and rejects six", () => {
    const five = makeContext({ taskIds: ["t1", "t2", "t3", "t4", "t5"] });
    const cards = Array.from({ length: 5 }, (_, index) => ({ title: `Card ${index}`, detail: "" }));
    expect(planPublication({ cards }, five).tasks).toHaveLength(5);
    expect(
      expectCode(() =>
        planPublication({ cards: [...cards, { title: "Card 5", detail: "" }] }, {
          ...five,
          taskIds: [...five.taskIds, "t6"],
        }),
      ),
    ).toBe("card_count_out_of_range");
  });

  it("rejects mismatched, duplicate and malformed identifiers", () => {
    expect(expectCode(() => planPublication(makePacket(), makeContext({ taskIds: ["t1", "t2"] })))).toBe(
      "identifier_count_mismatch",
    );
    expect(
      expectCode(() => planPublication(makePacket(), makeContext({ taskIds: ["t1", "t2", "t2"] }))),
    ).toBe("duplicate_identifier");
    expect(expectCode(() => planPublication(makePacket(), makeContext({ taskIds: ["t1", "t2", "a/b"] })))).toBe(
      "invalid_identifier",
    );
    expect(expectCode(() => planPublication(makePacket(), makeContext({ handoverId: "" })))).toBe(
      "invalid_identifier",
    );
    expect(expectCode(() => planPublication(makePacket(), makeContext({ venueId: " " })))).toBe(
      "invalid_identifier",
    );
    expect(expectCode(() => planPublication(makePacket(), makeContext({ creatorId: "x".repeat(65) })))).toBe(
      "invalid_identifier",
    );
  });

  it("does not mutate the reviewed packet", () => {
    const packet = makePacket();
    const snapshot = JSON.stringify(packet);
    Object.freeze(packet.cards);
    Object.freeze(packet);
    planPublication(packet, makeContext());
    expect(JSON.stringify(packet)).toBe(snapshot);
  });
});

describe("applyTransition accept", () => {
  it("assigns the incoming actor and appends one activity", () => {
    const task = makeTask();
    const { task: next, activity } = applyTransition(task, acceptCommand());
    expect(next.state).toBe("accepted");
    expect(next.ownerId).toBe(ACTOR);
    expect(next.version).toBe(2);
    expect(next.id).toBe(task.id);
    expect(activity.action).toBe("accept");
    expect(activity.fromState).toBe("open");
    expect(activity.toState).toBe("accepted");
    expect(activity.fromVersion).toBe(1);
    expect(activity.toVersion).toBe(2);
    expect(activity.actorId).toBe(ACTOR);
    expect(activity.id).toBe(activityIdFor(task.id, 2));
    expect(activity.resolution).toBeNull();
    expect(activity.reason).toBeNull();
    expect(activity.observation).toBeNull();
  });

  it("rejects outgoing actors and non-open tasks", () => {
    expect(
      expectCode(() =>
        applyTransition(makeTask(), { ...acceptCommand(), actorRole: "outgoing", actorId: OUTGOING }),
      ),
    ).toBe("forbidden_transition");
    expect(
      expectCode(() => applyTransition(makeTask({ state: "accepted", ownerId: ACTOR }), acceptCommand())),
    ).toBe("forbidden_transition");
    expect(
      expectCode(() =>
        applyTransition(makeTask({ state: "resolved", ownerId: ACTOR, resolution: "done" }), acceptCommand()),
      ),
    ).toBe("forbidden_transition");
  });

  it("rejects stale and malformed versions", () => {
    expect(expectCode(() => applyTransition(makeTask({ version: 2 }), acceptCommand(1)))).toBe("stale_version");
    expect(expectCode(() => applyTransition(makeTask(), acceptCommand(3)))).toBe("stale_version");
    expect(expectCode(() => applyTransition(makeTask(), acceptCommand(0)))).toBe("invalid_version");
    expect(expectCode(() => applyTransition(makeTask(), acceptCommand(1.5)))).toBe("invalid_version");
    expect(expectCode(() => applyTransition(makeTask({ version: 0 }), acceptCommand(0)))).toBe("invalid_version");
  });

  it("rejects unsafe versions and exhausted increments", () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 1;
    expect(expectCode(() => applyTransition(makeTask(), acceptCommand(unsafe)))).toBe("invalid_version");
    expect(expectCode(() => applyTransition(makeTask({ version: unsafe }), acceptCommand(unsafe)))).toBe(
      "invalid_version",
    );
    expect(expectCode(() => applyTransition(makeTask(), acceptCommand(1e308)))).toBe("invalid_version");
    expect(
      expectCode(() =>
        applyTransition(makeTask({ version: Number.MAX_SAFE_INTEGER }), acceptCommand(Number.MAX_SAFE_INTEGER)),
      ),
    ).toBe("invalid_version");
    const top = applyTransition(
      makeTask({ version: Number.MAX_SAFE_INTEGER - 1 }),
      acceptCommand(Number.MAX_SAFE_INTEGER - 1),
    );
    expect(top.task.version).toBe(Number.MAX_SAFE_INTEGER);
    expect(top.activity.toVersion).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects unknown actions, roles, states and identifiers", () => {
    expect(
      expectCode(() => applyTransition(makeTask(), { ...acceptCommand(), action: "delete" })),
    ).toBe("invalid_action");
    expect(expectCode(() => applyTransition(makeTask(), { ...acceptCommand(), actorRole: "admin" }))).toBe(
      "invalid_role",
    );
    expect(expectCode(() => applyTransition(makeTask({ state: "pending" as never }), acceptCommand()))).toBe(
      "invalid_state",
    );
    expect(expectCode(() => applyTransition(makeTask(), { ...acceptCommand(), actorId: "a/b" }))).toBe(
      "invalid_identifier",
    );
    expect(expectCode(() => applyTransition(makeTask({ id: "" }), acceptCommand()))).toBe("invalid_identifier");
  });

  it("rejects extra and missing command keys", () => {
    expect(expectCode(() => applyTransition(makeTask(), { ...acceptCommand(), ownerId: ACTOR }))).toBe(
      "unknown_key",
    );
    expect(
      expectCode(() => applyTransition(makeTask(), { action: "accept", actorRole: "incoming", expectedVersion: 1 })),
    ).toBe("missing_key");
  });

  it("does not mutate the task it was given", () => {
    const task = makeTask();
    Object.freeze(task);
    const { task: next } = applyTransition(task, acceptCommand());
    expect(next).not.toBe(task);
    expect(task.version).toBe(1);
    expect(task.state).toBe("open");
    expect(task.ownerId).toBeNull();
  });
});

describe("applyTransition task input contract", () => {
  it("rejects missing and unknown task keys instead of casting them", () => {
    const noHandover = { ...makeTask() } as Record<string, unknown>;
    delete noHandover.handoverId;
    expect(expectCode(() => applyTransition(noHandover, acceptCommand()))).toBe("missing_key");
    const noCreator = { ...makeTask() } as Record<string, unknown>;
    delete noCreator.creatorId;
    expect(expectCode(() => applyTransition(noCreator, acceptCommand()))).toBe("missing_key");
    expect(expectCode(() => applyTransition({ ...makeTask(), createdAt: "2026-11-16" }, acceptCommand()))).toBe(
      "unknown_key",
    );
    expect(expectCode(() => applyTransition(null, acceptCommand()))).toBe("not_an_object");
  });

  it("enforces the stored title, detail and identifier bounds", () => {
    expect(expectCode(() => applyTransition(makeTask({ title: ascii(121) }), acceptCommand()))).toBe(
      "byte_limit_exceeded",
    );
    expect(expectCode(() => applyTransition(makeTask({ title: "   " }), acceptCommand()))).toBe("blank_required");
    expect(expectCode(() => applyTransition(makeTask({ detail: ascii(801) }), acceptCommand()))).toBe(
      "byte_limit_exceeded",
    );
    expect(expectCode(() => applyTransition(makeTask({ handoverId: "h/1" }), acceptCommand()))).toBe(
      "invalid_identifier",
    );
    expect(expectCode(() => applyTransition(makeTask({ creatorId: "" }), acceptCommand()))).toBe(
      "invalid_identifier",
    );
    expect(applyTransition(makeTask({ title: ascii(120), detail: ascii(800) }), acceptCommand()).task.version).toBe(2);
  });

  it("rejects owner, state and resolution combinations no transition can produce", () => {
    expect(expectCode(() => applyTransition(makeTask({ ownerId: "incoming-other" }), acceptCommand()))).toBe(
      "invalid_state",
    );
    expect(expectCode(() => applyTransition(makeTask({ resolution: "done" }), acceptCommand()))).toBe("invalid_state");
    expect(expectCode(() => applyTransition(makeTask({ state: "accepted", ownerId: null }), acceptCommand()))).toBe(
      "invalid_state",
    );
    expect(
      expectCode(() =>
        applyTransition(makeTask({ state: "accepted", ownerId: ACTOR, resolution: "done" }), acceptCommand()),
      ),
    ).toBe("invalid_state");
    expect(
      expectCode(() =>
        applyTransition(makeTask({ state: "resolved", ownerId: ACTOR, resolution: null }), acceptCommand()),
      ),
    ).toBe("invalid_state");
    expect(
      expectCode(() =>
        applyTransition(makeTask({ state: "resolved", ownerId: null, resolution: "done" }), acceptCommand()),
      ),
    ).toBe("invalid_state");
  });

  it("validates the target snapshot with the same contract", () => {
    const source = makeTask();
    const target = makeTask({ id: "task-z9y8x7" });
    const observation = {
      action: "observe",
      actorId: OUTGOING,
      actorRole: "outgoing",
      expectedVersion: 1,
      kind: "duplicate",
      targetTaskId: target.id,
      targetVersion: 1,
      rationale: "Same cable kit.",
    };
    expect(expectCode(() => applyTransition(source, observation, { ...target, createdAt: "x" }))).toBe(
      "unknown_key",
    );
    expect(
      expectCode(() => applyTransition(source, observation, makeTask({ id: target.id, state: "accepted", ownerId: null }))),
    ).toBe("invalid_state");
  });
});

describe("applyTransition resolve", () => {
  const accepted = (ownerId: string = ACTOR) => makeTask({ state: "accepted", ownerId, version: 2 });

  it("records the resolution for the owner", () => {
    const { task: next, activity } = applyTransition(accepted(), {
      action: "resolve",
      actorId: ACTOR,
      actorRole: "incoming",
      expectedVersion: 2,
      resolution: "Bulbs replaced, one spare left.",
    });
    expect(next.state).toBe("resolved");
    expect(next.ownerId).toBe(ACTOR);
    expect(next.version).toBe(3);
    expect(next.resolution).toBe("Bulbs replaced, one spare left.");
    expect(activity.action).toBe("resolve");
    expect(activity.fromState).toBe("accepted");
    expect(activity.toState).toBe("resolved");
    expect(activity.fromVersion).toBe(2);
    expect(activity.toVersion).toBe(3);
    expect(activity.resolution).toBe("Bulbs replaced, one spare left.");
  });

  it("rejects non-owners, open tasks and outgoing actors", () => {
    expect(
      expectCode(() =>
        applyTransition(accepted("incoming-other"), {
          action: "resolve",
          actorId: ACTOR,
          actorRole: "incoming",
          expectedVersion: 2,
          resolution: "done",
        }),
      ),
    ).toBe("actor_not_owner");
    expect(
      expectCode(() =>
        applyTransition(makeTask(), {
          action: "resolve",
          actorId: ACTOR,
          actorRole: "incoming",
          expectedVersion: 1,
          resolution: "done",
        }),
      ),
    ).toBe("forbidden_transition");
    expect(
      expectCode(() =>
        applyTransition(accepted(), {
          action: "resolve",
          actorId: OUTGOING,
          actorRole: "outgoing",
          expectedVersion: 2,
          resolution: "done",
        }),
      ),
    ).toBe("forbidden_transition");
  });

  it("enforces the 800 byte resolution cap with supplementary text", () => {
    const command = (resolution: string) => ({
      action: "resolve" as const,
      actorId: ACTOR,
      actorRole: "incoming" as const,
      expectedVersion: 2,
      resolution,
    });
    expect(applyTransition(accepted(), command(supplementary(200))).task.resolution).toBe(supplementary(200));
    expect(expectCode(() => applyTransition(accepted(), command(supplementary(201))))).toBe(
      "byte_limit_exceeded",
    );
    expect(expectCode(() => applyTransition(accepted(), command("   ")))).toBe("blank_required");
  });
});

describe("applyTransition reopen", () => {
  const resolved = makeTask({ state: "resolved", ownerId: ACTOR, version: 3, resolution: "Bulbs replaced." });

  it("clears the task resolution, keeps the owner and records the reason", () => {
    const { task: next, activity } = applyTransition(resolved, {
      action: "reopen",
      actorId: ACTOR,
      actorRole: "incoming",
      expectedVersion: 3,
      reason: "Second bulb failed the same night.",
    });
    expect(next.state).toBe("accepted");
    expect(next.ownerId).toBe(ACTOR);
    expect(next.version).toBe(4);
    expect(next.resolution).toBeNull();
    expect(activity.action).toBe("reopen");
    expect(activity.fromState).toBe("resolved");
    expect(activity.toState).toBe("accepted");
    expect(activity.resolution).toBeNull();
    expect(activity.reason).toBe("Second bulb failed the same night.");
  });

  it("keeps the earlier resolution in its own activity record", () => {
    const resolvedStep = applyTransition(makeTask({ state: "accepted", ownerId: ACTOR, version: 2 }), {
      action: "resolve",
      actorId: ACTOR,
      actorRole: "incoming",
      expectedVersion: 2,
      resolution: "Bulbs replaced.",
    });
    const reopened = applyTransition(resolvedStep.task, {
      action: "reopen",
      actorId: ACTOR,
      actorRole: "incoming",
      expectedVersion: 3,
      reason: "Second bulb failed.",
    });
    expect(resolvedStep.activity.resolution).toBe("Bulbs replaced.");
    expect(reopened.activity.resolution).toBeNull();
    expect(reopened.task.resolution).toBeNull();
  });

  it("rejects non-owners, accepted tasks and blank or oversized reasons", () => {
    const base = { action: "reopen" as const, actorId: ACTOR, actorRole: "incoming" as const, expectedVersion: 3 };
    expect(expectCode(() => applyTransition(makeTask({ ...resolved, ownerId: "incoming-other" }), { ...base, reason: "x" }))).toBe(
      "actor_not_owner",
    );
    expect(
      expectCode(() =>
        applyTransition(makeTask({ state: "accepted", ownerId: ACTOR, version: 3 }), { ...base, reason: "x" }),
      ),
    ).toBe("forbidden_transition");
    expect(expectCode(() => applyTransition(resolved, { ...base, reason: "  " }))).toBe("blank_required");
    expect(expectCode(() => applyTransition(resolved, { ...base, reason: ascii(401) }))).toBe("byte_limit_exceeded");
    expect(
      applyTransition(resolved, { ...base, reason: combining(133) + "a" }).activity.reason,
    ).toBe(combining(133) + "a");
  });
});

describe("applyTransition observe", () => {
  const source = makeTask();
  const target = makeTask({ id: "task-z9y8x7", title: "Collect the borrowed cable kit" });

  const command = (overrides: Record<string, unknown> = {}) => ({
    action: "observe",
    actorId: OUTGOING,
    actorRole: "outgoing",
    expectedVersion: 1,
    kind: "duplicate",
    targetTaskId: target.id,
    targetVersion: 1,
    rationale: "Both cards describe the same cable kit.",
    ...overrides,
  });

  it("records the observation without touching state or owner", () => {
    const { task: next, activity } = applyTransition(source, command(), target);
    expect(next.state).toBe("open");
    expect(next.ownerId).toBeNull();
    expect(next.version).toBe(2);
    expect(activity.action).toBe("observe");
    expect(activity.fromState).toBe("open");
    expect(activity.toState).toBe("open");
    expect(activity.toVersion).toBe(2);
    expect(activity.observation).toEqual({
      kind: "duplicate",
      targetTaskId: target.id,
      targetVersion: 1,
      rationale: "Both cards describe the same cable kit.",
    });
  });

  it("accepts either member role", () => {
    const accepted = makeTask({ state: "accepted", ownerId: ACTOR, version: 4 });
    const { task: next } = applyTransition(
      accepted,
      command({ actorId: ACTOR, actorRole: "incoming", expectedVersion: 4, targetVersion: 2 }),
      makeTask({ id: target.id, state: "accepted", ownerId: "incoming-other", version: 2 }),
    );
    expect(next.state).toBe("accepted");
    expect(next.ownerId).toBe(ACTOR);
    expect(next.version).toBe(5);
  });

  it("rejects missing, duplicate, stale and unobservable targets", () => {
    expect(expectCode(() => applyTransition(source, command(), null))).toBe("missing_target");
    expect(expectCode(() => applyTransition(source, command({ targetTaskId: source.id }), source))).toBe(
      "duplicate_target",
    );
    expect(
      expectCode(() => applyTransition(source, command({ targetVersion: 2 }), target)),
    ).toBe("stale_target");
    expect(
      expectCode(() =>
        applyTransition(
          source,
          command(),
          makeTask({ id: target.id, state: "resolved", ownerId: "incoming-other", resolution: "done" }),
        ),
      ),
    ).toBe("target_state_not_observable");
    expect(expectCode(() => applyTransition(source, command({ kind: "merge" }), target))).toBe(
      "invalid_observation_kind",
    );
    expect(expectCode(() => applyTransition(source, command({ rationale: " " }), target))).toBe("blank_required");
    expect(expectCode(() => applyTransition(source, command({ rationale: ascii(401) }), target))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("rejects a target task from another venue", () => {
    expect(
      expectCode(() =>
        applyTransition(source, command(), makeTask({ id: target.id, venueId: "venue-other-02" })),
      ),
    ).toBe("forbidden_transition");
  });

  it("rejects a snapshot that is not the task the command names", () => {
    expect(
      expectCode(() => applyTransition(source, command({ targetTaskId: "task-unrelated-1" }), target)),
    ).toBe("forbidden_transition");
    expect(
      expectCode(() =>
        applyTransition(
          source,
          command(),
          makeTask({ id: "task-unrelated-1", title: "Unrelated task" }),
        ),
      ),
    ).toBe("forbidden_transition");
  });

  it("does not mutate the source or the target", () => {
    const task = makeTask();
    const taskSnapshot = JSON.stringify(task);
    const targetSnapshot = JSON.stringify(target);
    const { task: next } = applyTransition(task, command(), target);
    expect(JSON.stringify(task)).toBe(taskSnapshot);
    expect(JSON.stringify(target)).toBe(targetSnapshot);
    expect(Object.isFrozen(next)).toBe(true);
    expect(next).not.toBe(task);
  });

  it("rejects observations of resolved source tasks", () => {
    const resolved = makeTask({ state: "resolved", ownerId: ACTOR, version: 3, resolution: "done" });
    expect(expectCode(() => applyTransition(resolved, command({ expectedVersion: 3 }), target))).toBe(
      "forbidden_transition",
    );
  });
});

describe("contract fixture transitions agree with the implementation", () => {
  it.each(contrato.transitions.map((row) => [row.action, row.from, row] as const))(
    "%s from %s",
    (_action, _from, row) => {
      const task = makeTask({
        state: row.from as Task["state"],
        ownerId: row.from === "open" ? null : row.owner === "none" ? null : row.owner === "actor" ? ACTOR : "incoming-other",
        version: 2,
        resolution: row.from === "resolved" ? "earlier" : null,
      });
      const target = makeTask({ id: "task-target-1", version: 1 });
      const payload =
        row.action === "resolve"
          ? { resolution: "resolved text" }
          : row.action === "reopen"
            ? { reason: "reopen reason" }
            : row.action === "observe"
              ? { kind: "contradiction", targetTaskId: target.id, targetVersion: 1, rationale: "why" }
              : {};
      const actorId = row.roles[0] === "incoming" ? ACTOR : OUTGOING;
      const { task: next, activity } = applyTransition(
        task,
        {
          action: row.action,
          actorId,
          actorRole: row.roles[0],
          expectedVersion: 2,
          ...payload,
        },
        target,
      );
      expect(next.state).toBe(row.to);
      expect(next.version).toBe(2 + row.versionDelta);
      expect(activity.toVersion).toBe(next.version);
      expect(activity.id).toBe(activityIdFor(next.id, next.version));
      expect(next.ownerId).toBe(row.ownerAfter === "actor" ? actorId : task.ownerId);
    },
  );
});
