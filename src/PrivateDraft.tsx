/**
 * Private, memory-only draft surface. The raw note and unreviewed cards never leave this
 * component's state; only an explicitly reviewed, validated packet is handed upward.
 */
import { useRef, useState } from "react";
import type { ReviewedCard } from "./domain";
import type { PublicationRead, PublicationStatus } from "./tasks";
import { ContractError, utf8Bytes, validateReviewedPacket } from "./validation";

const MAX_CARDS = 5;
const RAW_NOTE_BYTES = 4000;

export interface PublicationIds {
  readonly handoverId: string;
  readonly taskIds: readonly string[];
}

interface DraftCard {
  readonly key: number;
  readonly title: string;
  readonly detail: string;
}

interface Review {
  readonly cards: readonly ReviewedCard[];
  readonly ids: PublicationIds;
}

interface Status {
  readonly tone: "pending" | "confirmed" | "error" | "info";
  readonly message: string;
}

interface PrivateDraftProps {
  readonly onPublish: (cards: readonly ReviewedCard[], ids: PublicationIds) => Promise<PublicationStatus>;
  readonly onCheck: (ids: PublicationIds) => Promise<PublicationRead>;
  readonly isCurrent: () => boolean;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
}

function makeIds(cardCount: number): PublicationIds {
  return {
    handoverId: newId("handover"),
    taskIds: Array.from({ length: cardCount }, () => newId("task")),
  };
}

function describeFieldError(error: unknown): string {
  if (!(error instanceof ContractError)) {
    return "The draft could not be reviewed. Try again.";
  }
  const card = /cards\[(\d+)\]/.exec(error.path)?.[1];
  const field = error.path.endsWith(".title")
    ? "title"
    : error.path.endsWith(".detail")
      ? "detail"
      : "field";
  const where = card === undefined ? "Private draft" : `Card ${Number(card) + 1} ${field}`;
  switch (error.code) {
    case "blank_required":
      return `${where}: enter at least one non-blank character.`;
    case "byte_limit_exceeded":
      return `${where}: shorten it to ${error.limit ?? "the"} UTF-8 bytes or fewer.`;
    case "unpaired_surrogate":
      return `${where}: the text contains an invalid Unicode sequence. Retype the affected characters.`;
    case "card_count_out_of_range":
      return "Add between 1 and 5 cards.";
    default:
      return `${where}: ${error.code}. Review the field and try again.`;
  }
}

export function PrivateDraft({ onPublish, onCheck, isCurrent }: PrivateDraftProps) {
  const nextKey = useRef(2);
  const [rawNote, setRawNote] = useState("");
  const [cards, setCards] = useState<DraftCard[]>([{ key: 1, title: "", detail: "" }]);
  const [review, setReview] = useState<Review | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState<"share" | "check" | null>(null);

  let rawNoteBytes = 0;
  let rawNoteError: string | null = null;
  try {
    rawNoteBytes = utf8Bytes(rawNote);
  } catch {
    rawNoteError = "The private note contains an invalid Unicode sequence. Retype the affected characters.";
  }
  if (rawNoteBytes > RAW_NOTE_BYTES) {
    rawNoteError = `Private note is ${rawNoteBytes} bytes. The limit is ${RAW_NOTE_BYTES} bytes.`;
  }

  function invalidateReview(): void {
    setReview(null);
    setStatus(null);
  }

  function updateCard(key: number, field: "title" | "detail", value: string): void {
    setCards((current) =>
      current.map((card) => (card.key === key ? { ...card, [field]: value } : card)),
    );
    invalidateReview();
  }

  function addCard(): void {
    if (cards.length >= MAX_CARDS) {
      return;
    }
    setCards((current) => [
      ...current,
      { key: nextKey.current, title: "", detail: "" },
    ]);
    nextKey.current += 1;
    invalidateReview();
  }

  function removeCard(key: number): void {
    setCards((current) => (current.length === 1 ? current : current.filter((card) => card.key !== key)));
    invalidateReview();
  }

  function reviewCards(): void {
    try {
      const packet = validateReviewedPacket({
        cards: cards.map((card) => ({ title: card.title, detail: card.detail })),
      });
      setReview({ cards: packet.cards, ids: makeIds(packet.cards.length) });
      setStatus({
        tone: "info",
        message: "Review the exact fields below. The private note is not part of this preview.",
      });
    } catch (error) {
      setReview(null);
      setStatus({ tone: "error", message: describeFieldError(error) });
    }
  }

  async function share(): Promise<void> {
    if (review === null) {
      return;
    }
    setPending("share");
    setStatus({ tone: "pending", message: "Publishing… waiting for server acknowledgment." });
    try {
      const result = await onPublish(review.cards, review.ids);
      if (!isCurrent()) {
        return;
      }
      setStatus({
        tone: "confirmed",
        message:
          result === "existing"
            ? "Server confirmed this handover was already published with these IDs. No duplicate was created."
            : `Server confirmed ${review.cards.length} open task${review.cards.length === 1 ? "" : "s"}. The private note was cleared from this tab.`,
      });
      setCards([{ key: nextKey.current, title: "", detail: "" }]);
      nextKey.current += 1;
      setRawNote("");
      setReview(null);
    } catch {
      if (!isCurrent()) {
        return;
      }
      setStatus({
        tone: "error",
        message:
          "Not confirmed. Nothing is shown as shared. Check the server with the same IDs, or retry explicitly.",
      });
    } finally {
      if (isCurrent()) {
        setPending(null);
      }
    }
  }

  async function checkServer(): Promise<void> {
    if (review === null) {
      return;
    }
    setPending("check");
    setStatus({ tone: "pending", message: "Reading the server for these exact IDs…" });
    try {
      const result = await onCheck(review.ids);
      if (!isCurrent()) {
        return;
      }
      if (result.status === "published") {
        setStatus({
          tone: "confirmed",
          message: `Server confirmed ${result.tasks.length} published task${result.tasks.length === 1 ? "" : "s"}. No retry is needed.`,
        });
        setReview(null);
        setRawNote("");
        setCards([{ key: nextKey.current, title: "", detail: "" }]);
        nextKey.current += 1;
      } else if (result.status === "absent") {
        setStatus({
          tone: "error",
          message: "The server has no publication with these IDs yet. Retry only if you intend to publish now.",
        });
      } else {
        setStatus({
          tone: "error",
          message: "The server has different records for these IDs. Do not retry; check with the venue administrator.",
        });
      }
    } catch {
      if (!isCurrent()) {
        return;
      }
      setStatus({
        tone: "error",
        message: "Not confirmed: the server could not be read. Reconnect and check again; no write is queued.",
      });
    } finally {
      if (isCurrent()) {
        setPending(null);
      }
    }
  }

  return (
    <section className="panel draft-panel" aria-labelledby="draft-heading">
      <div className="panel-heading">
        <p className="eyebrow">Private to this tab</p>
        <h2 id="draft-heading">Draft the handover</h2>
        <p className="panel-intro">
          Write the messy note, then turn only what the next shift needs into cards. The raw note is
          never shared and is lost on reload or sign-out.
        </p>
      </div>

      <label className="field-label" htmlFor="raw-note">
        Private shift note <span className="optional">(not shared)</span>
      </label>
      <textarea
        id="raw-note"
        data-testid="raw-note"
        className="input textarea"
        rows={5}
        value={rawNote}
        onChange={(event) => setRawNote(event.target.value)}
        aria-describedby="raw-note-help"
        placeholder="Projector bulb is low; cable kit still with Sam; entrance plants need water…"
      />
      <p id="raw-note-help" className={rawNoteError === null ? "field-help" : "field-help field-error"}>
        {rawNoteError ?? `${rawNoteBytes} / ${RAW_NOTE_BYTES} UTF-8 bytes · memory only`}
      </p>

      <fieldset className="card-fieldset">
        <legend>Reviewed cards (1–5)</legend>
        {cards.map((card, index) => (
          <div className="draft-card" key={card.key}>
            <div className="draft-card-heading">
              <h3>Card {index + 1}</h3>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => removeCard(card.key)}
                disabled={cards.length === 1}
              >
                Remove card {index + 1}
              </button>
            </div>
            <label className="field-label" htmlFor={`card-${card.key}-title`}>
              Card {index + 1} title
            </label>
            <input
              id={`card-${card.key}-title`}
              className="input"
              value={card.title}
              onChange={(event) => updateCard(card.key, "title", event.target.value)}
            />
            <label className="field-label" htmlFor={`card-${card.key}-detail`}>
              Card {index + 1} detail <span className="optional">(optional)</span>
            </label>
            <textarea
              id={`card-${card.key}-detail`}
              className="input textarea"
              rows={2}
              value={card.detail}
              onChange={(event) => updateCard(card.key, "detail", event.target.value)}
            />
          </div>
        ))}
      </fieldset>

      <div className="button-row">
        <button
          type="button"
          className="button button-secondary"
          onClick={addCard}
          disabled={cards.length >= MAX_CARDS}
        >
          Add card
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={reviewCards}
          disabled={rawNoteError !== null}
        >
          Review cards
        </button>
      </div>

      {status !== null && (
        <p
          className={`status status-${status.tone}`}
          role={status.tone === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      )}

      {review !== null && (
        <section className="review-panel" aria-labelledby="review-heading">
          <h3 id="review-heading">Review exact shared fields</h3>
          <p>Only these {review.cards.length} cards will be stored. The raw note is excluded.</p>
          <ol className="review-list">
            {review.cards.map((card, index) => (
              <li key={review.ids.taskIds[index] ?? index}>
                <h4>{card.title}</h4>
                {card.detail !== "" && <p>{card.detail}</p>}
                <p className="byte-note">
                  {utf8Bytes(card.title)} title bytes · {utf8Bytes(card.detail)} detail bytes
                </p>
              </li>
            ))}
          </ol>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void share()}
              disabled={pending !== null}
            >
              {pending === "share" ? "Publishing…" : "Share handover"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setReview(null);
                setStatus(null);
              }}
              disabled={pending !== null}
            >
              Edit cards
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => void checkServer()}
              disabled={pending !== null}
            >
              {pending === "check" ? "Checking…" : "Check server"}
            </button>
          </div>
          <p className="fine-print">
            Sharing is one explicit action. An uncertain result is never treated as published; use
            Check server or a deliberate retry with the same IDs.
          </p>
        </section>
      )}
    </section>
  );
}
