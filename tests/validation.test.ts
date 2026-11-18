import { describe, expect, it } from "vitest";
import contrato from "./fixtures/contrato.json";
import {
  ACTIVITY_ACTIONS,
  ID_PATTERN,
  LIMITS,
  OBSERVATION_KINDS,
  ROLES,
  TASK_STATES,
  activityIdFor,
} from "../src/domain";
import {
  CONTRACT_ERROR_CODES,
  ContractError,
  hasUnpairedSurrogate,
  utf8Bytes,
  validateReviewedPacket,
} from "../src/validation";
import {
  ascii,
  combining,
  expectCode,
  makePacket,
  precomposed,
  supplementary,
} from "./fixtures/handover";

describe("frozen contract fixture", () => {
  it("mirrors the code enums", () => {
    expect([...ROLES]).toEqual(contrato.enums.role);
    expect([...TASK_STATES]).toEqual(contrato.enums.taskState);
    expect([...ACTIVITY_ACTIONS]).toEqual(contrato.enums.activityAction);
    expect([...OBSERVATION_KINDS]).toEqual(contrato.enums.observationKind);
    expect(ID_PATTERN.source).toBe(contrato.idPattern);
  });

  it("mirrors the derived activity ID contract", () => {
    const taskId = "a".repeat(64);
    expect(contrato.activityIdTemplate).toBe("{taskId}__v{toVersion}");
    expect(activityIdFor(taskId, 1)).toBe(`${taskId}__v1`);
    expect(activityIdFor(taskId, Number.MAX_SAFE_INTEGER)).toHaveLength(
      contrato.activityIdMaxLength,
    );
  });

  it("mirrors the code limits", () => {
    expect(LIMITS).toEqual({
      titleBytes: contrato.limits.titleBytes.max,
      detailBytes: contrato.limits.detailBytes.max,
      resolutionBytes: contrato.limits.resolutionBytes.max,
      reopenReasonBytes: contrato.limits.reopenReasonBytes.max,
      observationRationaleBytes: contrato.limits.observationRationaleBytes.max,
      cardsPerPublication: contrato.limits.cardsPerPublication.max,
    });
    expect(LIMITS.titleBytes).toBe(120);
    expect(LIMITS.cardsPerPublication).toBe(5);
  });

  it("mirrors the error codes", () => {
    expect([...CONTRACT_ERROR_CODES].sort()).toEqual([...contrato.errors].sort());
  });
});

describe("utf8Bytes", () => {
  it("counts UTF-8 bytes, not UTF-16 units or code points", () => {
    expect(utf8Bytes("a")).toBe(1);
    expect(utf8Bytes(precomposed(1))).toBe(2);
    expect(utf8Bytes(combining(1))).toBe(3);
    expect(utf8Bytes(supplementary(1))).toBe(4);
    expect(utf8Bytes("")).toBe(0);
  });

  it("rejects unpaired surrogates instead of encoding a replacement character", () => {
    expect(hasUnpairedSurrogate("\uD83D")).toBe(true);
    expect(hasUnpairedSurrogate("a\uDC00b")).toBe(true);
    expect(hasUnpairedSurrogate(supplementary(1))).toBe(false);
    expect(hasUnpairedSurrogate("plain")).toBe(false);
    expect(expectCode(() => utf8Bytes("bad\uD800"))).toBe("unpaired_surrogate");
  });
});

describe("validateReviewedPacket", () => {
  it("accepts the three-card packet and preserves every string exactly", () => {
    const input = makePacket();
    const packet = validateReviewedPacket(input);
    expect(packet.cards).toHaveLength(3);
    expect(packet.cards[0]?.title).toBe("Restock projector bulbs");
    expect(packet.cards[2]?.detail).toBe("Left of the main door, every second day.");
  });

  it("accepts a single card with an empty detail", () => {
    const packet = validateReviewedPacket({ cards: [{ title: "One task", detail: "" }] });
    expect(packet.cards).toHaveLength(1);
    expect(packet.cards[0]?.detail).toBe("");
  });

  it("keeps combining and precomposed text distinct at 120 bytes", () => {
    const packet = validateReviewedPacket({
      cards: [
        { title: combining(40), detail: "" },
        { title: precomposed(60), detail: "" },
      ],
    });
    expect(packet.cards[0]?.title).toBe(combining(40));
    expect(packet.cards[1]?.title).toBe(precomposed(60));
    expect(packet.cards[0]?.title).not.toBe(packet.cards[1]?.title);
  });

  it("enforces the 120 byte title cap for ASCII", () => {
    expect(validateReviewedPacket({ cards: [{ title: ascii(120), detail: "" }] }).cards).toHaveLength(1);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: ascii(121), detail: "" }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("enforces the 120 byte title cap for supplementary characters", () => {
    expect(utf8Bytes(supplementary(30))).toBe(120);
    expect(validateReviewedPacket({ cards: [{ title: supplementary(30), detail: "" }] }).cards).toHaveLength(1);
    expect(utf8Bytes(supplementary(31))).toBe(124);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: supplementary(31), detail: "" }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("enforces the 120 byte title cap for combining sequences", () => {
    expect(utf8Bytes(combining(40))).toBe(120);
    expect(validateReviewedPacket({ cards: [{ title: combining(40), detail: "" }] }).cards).toHaveLength(1);
    expect(utf8Bytes(combining(41))).toBe(123);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: combining(41), detail: "" }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("enforces the 120 byte title cap for precomposed characters", () => {
    expect(utf8Bytes(precomposed(60))).toBe(120);
    expect(validateReviewedPacket({ cards: [{ title: precomposed(60), detail: "" }] }).cards).toHaveLength(1);
    expect(utf8Bytes(precomposed(61))).toBe(122);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: precomposed(61), detail: "" }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("enforces the 120 byte title cap for mixed scripts padded with ASCII", () => {
    const atCap = precomposed(50) + supplementary(5);
    expect(utf8Bytes(atCap)).toBe(120);
    expect(validateReviewedPacket({ cards: [{ title: atCap, detail: "" }] }).cards).toHaveLength(1);
    const overCap = atCap + ascii(1);
    expect(utf8Bytes(overCap)).toBe(121);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: overCap, detail: "" }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("enforces the 800 byte detail cap including supplementary text", () => {
    expect(validateReviewedPacket({ cards: [{ title: "T", detail: ascii(800) }] }).cards).toHaveLength(1);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "T", detail: ascii(801) }] }))).toBe(
      "byte_limit_exceeded",
    );
    expect(validateReviewedPacket({ cards: [{ title: "T", detail: supplementary(200) }] }).cards).toHaveLength(1);
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "T", detail: supplementary(201) }] }))).toBe(
      "byte_limit_exceeded",
    );
  });

  it("rejects blank and whitespace-only titles without trimming accepted text", () => {
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "", detail: "" }] }))).toBe("blank_required");
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "   ", detail: "" }] }))).toBe("blank_required");
    expect(validateReviewedPacket({ cards: [{ title: "  padded  ", detail: "" }] }).cards[0]?.title).toBe(
      "  padded  ",
    );
  });

  it("rejects unpaired surrogates in reviewed text", () => {
    expect(
      expectCode(() => validateReviewedPacket({ cards: [{ title: "bad\uD83D", detail: "" }] })),
    ).toBe("unpaired_surrogate");
    expect(
      expectCode(() => validateReviewedPacket({ cards: [{ title: "ok", detail: "\uDC00bad" }] })),
    ).toBe("unpaired_surrogate");
  });

  it("rejects unknown and missing keys at packet and card level", () => {
    expect(
      expectCode(() => validateReviewedPacket({ cards: [{ title: "T", detail: "" }], extra: 1 })),
    ).toBe("unknown_key");
    expect(
      expectCode(() => validateReviewedPacket({ cards: [{ title: "T", detail: "", ownerId: "incoming" }] })),
    ).toBe("unknown_key");
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "T" }] }))).toBe("missing_key");
    expect(expectCode(() => validateReviewedPacket({}))).toBe("missing_key");
  });

  it("rejects invalid shapes and types", () => {
    expect(expectCode(() => validateReviewedPacket(null))).toBe("not_an_object");
    expect(expectCode(() => validateReviewedPacket("packet"))).toBe("not_an_object");
    expect(expectCode(() => validateReviewedPacket({ cards: "one" }))).toBe("invalid_type");
    expect(expectCode(() => validateReviewedPacket({ cards: [null] }))).toBe("not_an_object");
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: 5, detail: "" }] }))).toBe("invalid_type");
    expect(expectCode(() => validateReviewedPacket({ cards: [{ title: "T", detail: null }] }))).toBe("invalid_type");
  });

  it("enforces the one to five card publication bound", () => {
    expect(expectCode(() => validateReviewedPacket({ cards: [] }))).toBe("card_count_out_of_range");
    const six = Array.from({ length: 6 }, () => ({ title: "T", detail: "" }));
    expect(expectCode(() => validateReviewedPacket({ cards: six }))).toBe("card_count_out_of_range");
    const five = Array.from({ length: 5 }, () => ({ title: "T", detail: "" }));
    expect(validateReviewedPacket({ cards: five }).cards).toHaveLength(5);
  });

  it("does not mutate its input and returns a separate frozen copy", () => {
    const input = JSON.parse(JSON.stringify(makePacket())) as {
      cards: { title: string; detail: string }[];
    };
    const before = JSON.stringify(input);
    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input);
    const packet = validateReviewedPacket(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(packet)).toBe(true);
    expect(Object.isFrozen(packet.cards)).toBe(true);
    expect(packet.cards[0]).not.toBe(input.cards[0]);
    expect(() => {
      (packet.cards[0] as { title: string }).title = "mutated";
    }).toThrow(TypeError);
    expect(input.cards[0]?.title).toBe("Restock projector bulbs");
  });

  it("never echoes rejected text in the error message", () => {
    const sentinel = "PRIVATE-SENTINEL-1234";
    let error: unknown;
    try {
      validateReviewedPacket({ cards: [{ title: ascii(200) + sentinel, detail: "" }] });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ContractError);
    expect((error as ContractError).message).not.toContain(sentinel);
    expect((error as ContractError).path).toBe("cards[0].title");
    expect((error as ContractError).limit).toBe(120);
  });
});
