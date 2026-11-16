/**
 * Synthetic fixtures for the frozen Phase 4 contract. Demo data only: no real venue,
 * note or identity content. Byte helpers build the spec's Unicode boundary cases.
 */
import type { PublicationContext, ReviewedPacket, Task } from "../../src/domain";
import { ContractError, type ContractErrorCode } from "../../src/validation";

export function ascii(bytes: number): string {
  return "a".repeat(bytes);
}

/** One U+1F600 is 4 UTF-8 bytes and 2 UTF-16 code units. */
export function supplementary(characters: number): string {
  return "\u{1F600}".repeat(characters);
}

/** `e` + U+0301 is 3 UTF-8 bytes per repetition and must never be normalized. */
export function combining(repetitions: number): string {
  return "e\u0301".repeat(repetitions);
}

/** Precomposed U+00E9 is 2 UTF-8 bytes, visually similar to the combining pair. */
export function precomposed(characters: number): string {
  return "\u00E9".repeat(characters);
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-a1b2c3",
    venueId: "venue-hall-01",
    handoverId: "handover-0001",
    creatorId: "outgoing-robin",
    title: "Restock projector bulbs",
    detail: "Two spare bulbs are in the storage cupboard.",
    state: "open",
    ownerId: null,
    version: 1,
    resolution: null,
    ...overrides,
  };
}

export function makePacket(): ReviewedPacket {
  return {
    cards: [
      {
        title: "Restock projector bulbs",
        detail: "Two spare bulbs are in the storage cupboard.",
      },
      { title: "Return borrowed cable kit", detail: "" },
      {
        title: "Water the entrance plants",
        detail: "Left of the main door, every second day.",
      },
    ],
  };
}

export function makeContext(overrides: Partial<PublicationContext> = {}): PublicationContext {
  return {
    venueId: "venue-hall-01",
    handoverId: "handover-0001",
    creatorId: "outgoing-robin",
    taskIds: ["task-a1b2c3", "task-d4e5f6", "task-g7h8i9"],
    ...overrides,
  };
}

export function expectCode(run: () => unknown): ContractErrorCode {
  try {
    run();
  } catch (error) {
    if (error instanceof ContractError) {
      return error.code;
    }
    throw error;
  }
  throw new Error("expected ContractError, nothing was thrown");
}
