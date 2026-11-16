/**
 * ShiftRelay frozen domain contract (Phase 4). Types and limits only: no persistence,
 * no SDK, no UI. Every text limit is UTF-8 bytes of the exact string; see docs/INTERFACES.md.
 * Server timestamps deliberately do not appear here: the persistence boundary sets them.
 */

export const ROLES = ["outgoing", "incoming"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATES = ["open", "accepted", "resolved"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const ACTIVITY_ACTIONS = ["create", "accept", "resolve", "reopen", "observe"] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const OBSERVATION_KINDS = ["duplicate", "contradiction"] as const;
export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

/** Firestore document IDs are also path segments, so callers cannot pass arbitrary text. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const LIMITS = {
  titleBytes: 120,
  detailBytes: 800,
  resolutionBytes: 800,
  reopenReasonBytes: 400,
  observationRationaleBytes: 400,
  cardsPerPublication: 5,
} as const;

export interface ReviewedCard {
  readonly title: string;
  readonly detail: string;
}

export interface ReviewedPacket {
  readonly cards: readonly ReviewedCard[];
}

export interface Handover {
  readonly id: string;
  readonly venueId: string;
  readonly creatorId: string;
  readonly taskIds: readonly string[];
}

export interface Task {
  readonly id: string;
  readonly venueId: string;
  readonly handoverId: string;
  readonly creatorId: string;
  readonly title: string;
  readonly detail: string;
  readonly state: TaskState;
  readonly ownerId: string | null;
  readonly version: number;
  readonly resolution: string | null;
}

export interface ObservationRecord {
  readonly kind: ObservationKind;
  readonly targetTaskId: string;
  readonly targetVersion: number;
  readonly rationale: string;
}

export interface ActivityRecord {
  readonly id: string;
  readonly taskId: string;
  readonly venueId: string;
  readonly actorId: string;
  readonly action: ActivityAction;
  readonly fromState: TaskState | null;
  readonly toState: TaskState;
  readonly fromVersion: number | null;
  readonly toVersion: number;
  readonly resolution: string | null;
  readonly reason: string | null;
  readonly observation: ObservationRecord | null;
}

export interface PublicationContext {
  readonly venueId: string;
  readonly handoverId: string;
  readonly creatorId: string;
  readonly taskIds: readonly string[];
}

export interface PublicationPlan {
  readonly handover: Handover;
  readonly tasks: readonly Task[];
  readonly activities: readonly ActivityRecord[];
}

export type TransitionCommand =
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
      readonly kind: ObservationKind;
      readonly targetTaskId: string;
      readonly targetVersion: number;
      readonly rationale: string;
    };

export interface TransitionResult {
  readonly task: Task;
  readonly activity: ActivityRecord;
}

/** One activity per task version, derived so a retry cannot fork the history. */
export function activityIdFor(taskId: string, version: number): string {
  return `${taskId}__v${version}`;
}
