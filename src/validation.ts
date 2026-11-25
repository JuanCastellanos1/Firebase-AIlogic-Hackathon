/**
 * Runtime validation for the frozen Phase 4 contract: untrusted input in, plain frozen
 * domain objects or a ContractError out. No normalization, no truncation, no clock access.
 * Error messages name the field and code only; rejected text is never echoed.
 */
import {
  LIMITS,
  ROLES,
  TASK_STATES,
  type ActivityRecord,
  type ObservationRecord,
  type PublicationPlan,
  type Role,
  type Task,
  type TaskState,
  type TransitionResult,
  OBSERVATION_KINDS,
  activityIdFor,
} from "./domain";

export const CONTRACT_ERROR_CODES = [
  "not_an_object",
  "unknown_key",
  "missing_key",
  "invalid_type",
  "invalid_identifier",
  "duplicate_identifier",
  "identifier_count_mismatch",
  "card_count_out_of_range",
  "blank_required",
  "byte_limit_exceeded",
  "unpaired_surrogate",
  "invalid_role",
  "invalid_state",
  "invalid_action",
  "invalid_version",
  "stale_version",
  "forbidden_transition",
  "actor_not_owner",
  "invalid_observation_kind",
  "missing_target",
  "duplicate_target",
  "stale_target",
  "target_state_not_observable",
] as const;

export type ContractErrorCode = (typeof CONTRACT_ERROR_CODES)[number];

export class ContractError extends Error {
  readonly code: ContractErrorCode;
  readonly path: string;
  readonly limit?: number;

  constructor(code: ContractErrorCode, path: string, limit?: number) {
    super(limit === undefined ? `${code} at ${path}` : `${code} at ${path} (limit ${limit})`);
    this.name = "ContractError";
    this.code = code;
    this.path = path;
    if (limit !== undefined) {
      this.limit = limit;
    }
  }
}

function fail(code: ContractErrorCode, path: string, limit?: number): never {
  throw new ContractError(code, path, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      fail("unknown_key", `${path}.${key}`);
    }
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail("missing_key", `${path}.${key}`);
    }
  }
}

export function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

const encoder = new TextEncoder();

function bytesAt(value: string, path: string): number {
  if (hasUnpairedSurrogate(value)) {
    fail("unpaired_surrogate", path);
  }
  return encoder.encode(value).length;
}

export function utf8Bytes(value: string): number {
  return bytesAt(value, "text");
}

function textField(value: unknown, path: string, minBytes: number, maxBytes: number): string {
  if (typeof value !== "string") {
    fail("invalid_type", path);
  }
  const bytes = bytesAt(value, path);
  if (minBytes > 0 && value.trim() === "") {
    fail("blank_required", path);
  }
  if (bytes < minBytes) {
    fail("blank_required", path);
  }
  if (bytes > maxBytes) {
    fail("byte_limit_exceeded", path, maxBytes);
  }
  return value;
}

function identifier(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    fail("invalid_identifier", path);
  }
  return value;
}

function versionField(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    fail("invalid_version", path);
  }
  return value;
}

export function validateReviewedPacket(input: unknown): { readonly cards: readonly { readonly title: string; readonly detail: string }[] } {
  if (!isRecord(input)) {
    fail("not_an_object", "packet");
  }
  exactKeys(input, ["cards"], "packet");
  const cards = input.cards;
  if (!Array.isArray(cards)) {
    fail("invalid_type", "packet.cards");
  }
  if (cards.length < 1 || cards.length > LIMITS.cardsPerPublication) {
    fail("card_count_out_of_range", "packet.cards", LIMITS.cardsPerPublication);
  }
  const reviewed = cards.map((card, index) => {
    const path = `cards[${index}]`;
    if (!isRecord(card)) {
      fail("not_an_object", path);
    }
    exactKeys(card, ["title", "detail"], path);
    return Object.freeze({
      title: textField(card.title, `${path}.title`, 1, LIMITS.titleBytes),
      detail: textField(card.detail, `${path}.detail`, 0, LIMITS.detailBytes),
    });
  });
  return Object.freeze({ cards: Object.freeze(reviewed) });
}

export function planPublication(packetInput: unknown, contextInput: unknown): PublicationPlan {
  const packet = validateReviewedPacket(packetInput);
  if (!isRecord(contextInput)) {
    fail("not_an_object", "context");
  }
  exactKeys(contextInput, ["venueId", "handoverId", "creatorId", "taskIds"], "context");
  const venueId = identifier(contextInput.venueId, "context.venueId");
  const handoverId = identifier(contextInput.handoverId, "context.handoverId");
  const creatorId = identifier(contextInput.creatorId, "context.creatorId");
  const rawIds = contextInput.taskIds;
  if (!Array.isArray(rawIds)) {
    fail("invalid_type", "context.taskIds");
  }
  const taskIds = rawIds.map((id, index) => identifier(id, `context.taskIds[${index}]`));
  if (taskIds.length !== packet.cards.length) {
    fail("identifier_count_mismatch", "context.taskIds");
  }
  if (new Set(taskIds).size !== taskIds.length) {
    fail("duplicate_identifier", "context.taskIds");
  }

  const tasks: Task[] = packet.cards.map((card, index) =>
    Object.freeze({
      id: taskIds[index] as string,
      venueId,
      handoverId,
      creatorId,
      title: card.title,
      detail: card.detail,
      state: "open" as const,
      ownerId: null,
      version: 1,
      resolution: null,
    }),
  );
  const activities: ActivityRecord[] = tasks.map((task) =>
    Object.freeze({
      id: activityIdFor(task.id, 1),
      taskId: task.id,
      venueId,
      actorId: creatorId,
      action: "create" as const,
      fromState: null,
      toState: "open" as const,
      fromVersion: null,
      toVersion: 1,
      resolution: null,
      reason: null,
      observation: null,
    }),
  );

  return Object.freeze({
    handover: Object.freeze({ id: handoverId, venueId, creatorId, taskIds: Object.freeze([...taskIds]) }),
    tasks: Object.freeze(tasks),
    activities: Object.freeze(activities),
  });
}

type ValidatedCommand =
  | { readonly action: "accept"; readonly actorId: string; readonly actorRole: Role; readonly expectedVersion: number }
  | {
      readonly action: "resolve";
      readonly actorId: string;
      readonly actorRole: Role;
      readonly expectedVersion: number;
      readonly resolution: string;
    }
  | {
      readonly action: "reopen";
      readonly actorId: string;
      readonly actorRole: Role;
      readonly expectedVersion: number;
      readonly reason: string;
    }
  | {
      readonly action: "observe";
      readonly actorId: string;
      readonly actorRole: Role;
      readonly expectedVersion: number;
      readonly observation: ObservationRecord;
    };

const COMMAND_KEYS = {
  accept: ["action", "actorId", "actorRole", "expectedVersion"],
  resolve: ["action", "actorId", "actorRole", "expectedVersion", "resolution"],
  reopen: ["action", "actorId", "actorRole", "expectedVersion", "reason"],
  observe: [
    "action",
    "actorId",
    "actorRole",
    "expectedVersion",
    "kind",
    "targetTaskId",
    "targetVersion",
    "rationale",
  ],
} as const;

function validateCommand(input: unknown): ValidatedCommand {
  if (!isRecord(input)) {
    fail("not_an_object", "command");
  }
  const action = input.action;
  if (typeof action !== "string" || !Object.prototype.hasOwnProperty.call(COMMAND_KEYS, action)) {
    fail("invalid_action", "command.action");
  }
  const keys = COMMAND_KEYS[action as keyof typeof COMMAND_KEYS];
  exactKeys(input, keys, "command");
  const actorId = identifier(input.actorId, "command.actorId");
  const actorRole = input.actorRole;
  if (typeof actorRole !== "string" || !(ROLES as readonly string[]).includes(actorRole)) {
    fail("invalid_role", "command.actorRole");
  }
  const expectedVersion = versionField(input.expectedVersion, "command.expectedVersion");

  switch (action) {
    case "accept":
      return { action, actorId, actorRole: actorRole as Role, expectedVersion };
    case "resolve":
      return {
        action,
        actorId,
        actorRole: actorRole as Role,
        expectedVersion,
        resolution: textField(input.resolution, "command.resolution", 1, LIMITS.resolutionBytes),
      };
    case "reopen":
      return {
        action,
        actorId,
        actorRole: actorRole as Role,
        expectedVersion,
        reason: textField(input.reason, "command.reason", 1, LIMITS.reopenReasonBytes),
      };
    case "observe": {
      const kind = input.kind;
      if (typeof kind !== "string" || !(OBSERVATION_KINDS as readonly string[]).includes(kind)) {
        fail("invalid_observation_kind", "command.kind");
      }
      return {
        action,
        actorId,
        actorRole: actorRole as Role,
        expectedVersion,
        observation: {
          kind: kind as ObservationRecord["kind"],
          targetTaskId: identifier(input.targetTaskId, "command.targetTaskId"),
          targetVersion: versionField(input.targetVersion, "command.targetVersion"),
          rationale: textField(input.rationale, "command.rationale", 1, LIMITS.observationRationaleBytes),
        },
      };
    }
    default:
      return fail("invalid_action", "command.action");
  }
}

const TASK_KEYS = [
  "id",
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

/**
 * `Task` is the authoritative persisted-free subset; the adapter supplies timestamps.
 * Task input is a trust boundary here, so the whole contract is validated, never cast:
 * unknown/missing keys, identifier and byte caps, and the state/owner/resolution
 * combinations that no transition can produce.
 */
function readTask(value: unknown, path: string): Task {
  if (!isRecord(value)) {
    fail("not_an_object", path);
  }
  exactKeys(value, TASK_KEYS, path);
  const id = identifier(value.id, `${path}.id`);
  const venueId = identifier(value.venueId, `${path}.venueId`);
  const handoverId = identifier(value.handoverId, `${path}.handoverId`);
  const creatorId = identifier(value.creatorId, `${path}.creatorId`);
  const title = textField(value.title, `${path}.title`, 1, LIMITS.titleBytes);
  const detail = textField(value.detail, `${path}.detail`, 0, LIMITS.detailBytes);
  const state = value.state;
  if (typeof state !== "string" || !(TASK_STATES as readonly string[]).includes(state)) {
    fail("invalid_state", `${path}.state`);
  }
  const version = versionField(value.version, `${path}.version`);
  const ownerId = value.ownerId === null ? null : identifier(value.ownerId, `${path}.ownerId`);
  const resolution =
    value.resolution === null
      ? null
      : textField(value.resolution, `${path}.resolution`, 1, LIMITS.resolutionBytes);
  if (state === "open") {
    if (ownerId !== null) {
      fail("invalid_state", `${path}.ownerId`);
    }
    if (resolution !== null) {
      fail("invalid_state", `${path}.resolution`);
    }
  } else {
    if (ownerId === null) {
      fail("invalid_state", `${path}.ownerId`);
    }
    if ((state === "resolved") !== (resolution !== null)) {
      fail("invalid_state", `${path}.resolution`);
    }
  }
  return Object.freeze({
    id,
    venueId,
    handoverId,
    creatorId,
    title,
    detail,
    state: state as TaskState,
    ownerId,
    version,
    resolution,
  });
}

/** Server-read task validation for the UI boundary; timestamps are deliberately not part of Task. */
export function validateTask(input: unknown): Task {
  return readTask(input, "task");
}

export function applyTransition(
  taskInput: unknown,
  commandInput: unknown,
  targetTask: unknown = null,
): TransitionResult {
  const task = readTask(taskInput, "task");
  const command = validateCommand(commandInput);

  if (task.version >= Number.MAX_SAFE_INTEGER) {
    fail("invalid_version", "task.version");
  }
  if (command.expectedVersion !== task.version) {
    fail("stale_version", "command.expectedVersion");
  }
  if (command.action !== "observe" && command.actorRole !== "incoming") {
    fail("forbidden_transition", "command.actorRole");
  }

  let state: TaskState = task.state;
  let ownerId: string | null = task.ownerId;
  let resolution: string | null = task.resolution;

  switch (command.action) {
    case "accept":
      if (task.state !== "open" || task.ownerId !== null) {
        fail("forbidden_transition", "task.state");
      }
      state = "accepted";
      ownerId = command.actorId;
      resolution = null;
      break;
    case "resolve":
      if (task.state !== "accepted") {
        fail("forbidden_transition", "task.state");
      }
      if (task.ownerId !== command.actorId) {
        fail("actor_not_owner", "task.ownerId");
      }
      state = "resolved";
      resolution = command.resolution;
      break;
    case "reopen":
      if (task.state !== "resolved") {
        fail("forbidden_transition", "task.state");
      }
      if (task.ownerId !== command.actorId) {
        fail("actor_not_owner", "task.ownerId");
      }
      state = "accepted";
      resolution = null;
      break;
    case "observe": {
      if (task.state !== "open" && task.state !== "accepted") {
        fail("forbidden_transition", "task.state");
      }
      if (targetTask === null) {
        fail("missing_target", "targetTask");
      }
      const target = readTask(targetTask, "targetTask");
      if (target.id !== command.observation.targetTaskId) {
        fail("forbidden_transition", "targetTask.id");
      }
      if (target.id === task.id) {
        fail("duplicate_target", "command.targetTaskId");
      }
      if (target.venueId !== task.venueId) {
        fail("forbidden_transition", "targetTask.venueId");
      }
      if (target.version !== command.observation.targetVersion) {
        fail("stale_target", "command.targetVersion");
      }
      if (target.state !== "open" && target.state !== "accepted") {
        fail("target_state_not_observable", "targetTask.state");
      }
      break;
    }
  }

  const nextVersion = task.version + 1;
  const nextTask: Task = Object.freeze({
    ...task,
    state,
    ownerId,
    version: nextVersion,
    resolution,
  });

  return Object.freeze({
    task: nextTask,
    activity: Object.freeze({
      id: activityIdFor(task.id, nextVersion),
      taskId: task.id,
      venueId: task.venueId,
      actorId: command.actorId,
      action: command.action,
      fromState: task.state,
      toState: state,
      fromVersion: task.version,
      toVersion: nextVersion,
      resolution: command.action === "resolve" ? command.resolution : null,
      reason: command.action === "reopen" ? command.reason : null,
      observation: command.action === "observe" ? command.observation : null,
    }),
  });
}
