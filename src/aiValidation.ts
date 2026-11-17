/**
 * Runtime validation for local drafting output (slice 2). Untrusted model text in, frozen
 * suggestions or an AiOutputError out. Nothing is trimmed, normalized, truncated or executed,
 * and an error message never echoes the rejected text.
 *
 * Contract: docs/INTERFACES.md §9 and tests/fixtures/contrato.json `localDraft`.
 */
import { hasUnpairedSurrogate, utf8Bytes } from "./validation";

export const AI_DRAFT_LIMITS = {
  responseBytes: 12000,
  noteBytes: 4000,
  cards: 5,
  titleBytes: 120,
  detailBytes: 800,
} as const;

export const AI_OUTPUT_ERROR_CODES = [
  "not_an_object",
  "unknown_key",
  "missing_key",
  "invalid_type",
  "card_count_out_of_range",
  "blank_required",
  "byte_limit_exceeded",
  "unpaired_surrogate",
  "empty_response",
  "invalid_json",
  "response_too_large",
  "invalid_source_span",
  "note_empty",
  "note_too_large",
] as const;

export type AiOutputErrorCode = (typeof AI_OUTPUT_ERROR_CODES)[number];

export class AiOutputError extends Error {
  readonly code: AiOutputErrorCode;
  readonly path: string;

  constructor(code: AiOutputErrorCode, path: string) {
    super(`${code} at ${path}`);
    this.name = "AiOutputError";
    this.code = code;
    this.path = path;
  }
}

export interface DraftSuggestion {
  readonly title: string;
  readonly detail: string;
  /** UTF-16 offset into the private note; never inside a surrogate pair. */
  readonly sourceStart: number;
  readonly sourceEnd: number;
}

function fail(code: AiOutputErrorCode, path: string): never {
  throw new AiOutputError(code, path);
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

function bytes(value: string, path: string): number {
  if (hasUnpairedSurrogate(value)) {
    fail("unpaired_surrogate", path);
  }
  return utf8Bytes(value);
}

function text(value: unknown, path: string, minBytes: number, maxBytes: number): string {
  if (typeof value !== "string") {
    fail("invalid_type", path);
  }
  const size = bytes(value, path);
  if (minBytes > 0 && (size < minBytes || value.trim() === "")) {
    fail("blank_required", path);
  }
  if (size > maxBytes) {
    fail("byte_limit_exceeded", path);
  }
  return value;
}

function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail("invalid_type", path);
  }
  return value;
}

/** True when `index` would cut a valid surrogate pair in two. */
function splitsSurrogate(value: string, index: number): boolean {
  if (index <= 0 || index >= value.length) {
    return false;
  }
  const before = value.charCodeAt(index - 1);
  const at = value.charCodeAt(index);
  return before >= 0xd800 && before <= 0xdbff && at >= 0xdc00 && at <= 0xdfff;
}

function readNote(input: unknown): string {
  if (typeof input !== "string") {
    fail("invalid_type", "note");
  }
  const size = bytes(input, "note");
  if (size === 0) {
    fail("note_empty", "note");
  }
  if (size > AI_DRAFT_LIMITS.noteBytes) {
    fail("note_too_large", "note");
  }
  return input;
}

function readSuggestion(value: unknown, note: string, path: string): DraftSuggestion {
  if (!isRecord(value)) {
    fail("not_an_object", path);
  }
  exactKeys(value, ["title", "detail", "sourceStart", "sourceEnd"], path);
  const title = text(value.title, `${path}.title`, 1, AI_DRAFT_LIMITS.titleBytes);
  const detail = text(value.detail, `${path}.detail`, 0, AI_DRAFT_LIMITS.detailBytes);
  const sourceStart = integer(value.sourceStart, `${path}.sourceStart`);
  const sourceEnd = integer(value.sourceEnd, `${path}.sourceEnd`);
  if (
    sourceStart < 0 ||
    sourceEnd > note.length ||
    sourceStart >= sourceEnd ||
    splitsSurrogate(note, sourceStart) ||
    splitsSurrogate(note, sourceEnd)
  ) {
    fail("invalid_source_span", `${path}.sourceStart`);
  }
  return Object.freeze({ title, detail, sourceStart, sourceEnd });
}

/**
 * Cap the raw response at 12,000 UTF-8 bytes before JSON parsing, then validate the exact
 * shape. The caller keeps the private note: any failure leaves manual entry untouched.
 */
export function validateDraftOutput(input: unknown, noteInput: unknown): readonly DraftSuggestion[] {
  if (typeof input !== "string") {
    fail("invalid_type", "response");
  }
  const size = bytes(input, "response");
  if (size === 0 || input.trim() === "") {
    fail("empty_response", "response");
  }
  if (size > AI_DRAFT_LIMITS.responseBytes) {
    fail("response_too_large", "response");
  }
  const note = readNote(noteInput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    fail("invalid_json", "response");
  }
  if (!isRecord(parsed)) {
    fail("not_an_object", "response");
  }
  exactKeys(parsed, ["cards"], "response");
  const cards = parsed.cards;
  if (!Array.isArray(cards)) {
    fail("invalid_type", "response.cards");
  }
  if (cards.length < 1 || cards.length > AI_DRAFT_LIMITS.cards) {
    fail("card_count_out_of_range", "response.cards");
  }
  return Object.freeze(
    cards.map((entry, index) => readSuggestion(entry, note, `response.cards[${index}]`)),
  );
}
