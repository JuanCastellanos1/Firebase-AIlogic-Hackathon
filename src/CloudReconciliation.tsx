/**
 * Optional cloud reconciliation surface (slice 3). The preview is local and exact; one explicit
 * approval produces at most one request; suggestions never write. A confirmed suggestion is one
 * ordinary `observe` activity on the current source version, and a dismissal writes nothing.
 *
 * The shared task signature is watched: when the shared tasks change, the effect below clears the
 * preview, approval and suggestions, so no stale approval survives a context change.
 */
import { useEffect, useRef, useState } from "react";
import type { Role, Task, TransitionCommand } from "./domain";
import { cloudReconciliationProvider } from "./cloudReconcile";
import {
  RECONCILE_LIMITS,
  ReconcileError,
  consentStatus,
  createCloudConsent,
  observationCommandFor,
  planReconciliation,
  validateReconcileOutput,
  type CloudConsent,
  type ReconcileResult,
  type ReconcileSuggestion,
  type ReconciliationPlan,
  type ReconciliationPreview,
} from "./reconciliation";
import { describeFailure } from "./session";
import { utf8Bytes } from "./validation";

interface ReconciliationProps {
  readonly tasks: readonly Task[];
  readonly uid: string;
  readonly role: Role;
  readonly onReadFreshTasks: () => Promise<readonly Task[]>;
  readonly onConfirmObservation: (taskId: string, command: TransitionCommand) => Promise<void>;
}

interface Status {
  readonly tone: "pending" | "confirmed" | "error" | "info";
  readonly message: string;
}

/** Published content is immutable, so id + version + state identifies a context change. */
function taskSignatureOf(tasks: readonly Task[]): string {
  return tasks
    .map((task) => `${task.id}@${task.version}:${task.state}`)
    .sort()
    .join("|");
}

function describePlanFailure(code: string): string {
  switch (code) {
    case "source_count_out_of_range":
      return "Choose between 1 and 5 source tasks.";
    case "context_count_out_of_range":
      return "Choose at most 20 context tasks.";
    case "task_state_not_reconcilable":
      return "Only open or accepted tasks can be compared. Refresh and choose again.";
    case "duplicate_task_id":
    case "unknown_task_id":
      return "The selection no longer matches the shared tasks. Refresh and choose again.";
    default:
      return "That selection cannot be compared. Refresh and choose again.";
  }
}

function describeCloudFailure(error: unknown): string {
  if (error instanceof ReconcileError) {
    switch (error.code) {
      case "response_too_large":
        return "The cloud model returned more than 12,000 bytes, so the response was rejected. Nothing was written.";
      case "invalid_json":
      case "empty_response":
      case "not_an_object":
        return "The cloud model did not return the expected JSON, so the response was rejected. Nothing was written.";
      case "unknown_task_id":
      case "stale_task_version":
      case "duplicate_target":
        return "The cloud model referenced tasks or versions that are not in the approved packet, so the response was rejected. Nothing was written.";
      default:
        return "The cloud model returned a response this app cannot accept, so it was rejected. Nothing was written.";
    }
  }
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (/quota|resource-exhausted|rate|429/i.test(code)) {
    return "Cloud quota is exhausted right now. Nothing was written and no retry was sent; manual work is unaffected.";
  }
  if (/unavailable|deadline|network|offline/i.test(code)) {
    return "The cloud model is unreachable or offline. Nothing was written and no retry was queued; manual work is unaffected.";
  }
  if (/permission|unauthenticated|unauthor|forbidden|auth/i.test(code)) {
    return "This session is not authorized for the cloud model. Nothing was written; manual work is unaffected.";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "The request was canceled. Nothing was written.";
  }
  return "Cloud reconciliation failed. Nothing was written and no retry was sent; manual work is unaffected.";
}

export function CloudReconciliation({
  tasks,
  uid,
  role,
  onReadFreshTasks,
  onConfirmObservation,
}: ReconciliationProps) {
  const [provider] = useState(cloudReconciliationProvider);
  const [sourceIds, setSourceIds] = useState<readonly string[]>([]);
  const [contextIds, setContextIds] = useState<readonly string[]>([]);
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [consent, setConsent] = useState<CloudConsent | null>(null);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [pending, setPending] = useState<"send" | "confirm" | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [taskSignature, setTaskSignature] = useState(taskSignatureOf(tasks));
  const mounted = useRef(true);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current += 1;
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  const comparable = tasks.filter((task) => task.state === "open" || task.state === "accepted");
  const others = comparable.filter((task) => !sourceIds.includes(task.id));
  const needsSelection = others.length > RECONCILE_LIMITS.contextTasks;

  // Documented "adjust state when props change" pattern: a context change drops the exact
  // packet, the one-shot approval and the suggestions before they can be used.
  const nextTaskSignature = taskSignatureOf(tasks);
  if (nextTaskSignature !== taskSignature) {
    setTaskSignature(nextTaskSignature);
    if (preview !== null || consent !== null || result !== null) {
      setPreview(null);
      setConsent(null);
      setResult(null);
      setStatus({
        tone: "info",
        message:
          "Shared tasks changed, so the preview, approval and suggestions were cleared. Preview again.",
      });
    }
  }

  function invalidate(message?: string): void {
    setPreview(null);
    setConsent(null);
    setResult(null);
    if (message !== undefined) {
      setStatus({ tone: "info", message });
    }
  }

  function planFor(
    taskList: readonly Task[],
    sources: readonly string[],
    contexts: readonly string[],
  ): ReconciliationPlan {
    return planReconciliation({
      tasks: taskList,
      sourceTaskIds: sources,
      ...(needsSelection ? { contextTaskIds: contexts } : {}),
    });
  }

  function toggleSource(taskId: string): void {
    if (pending !== null) {
      return;
    }
    const next = sourceIds.includes(taskId)
      ? sourceIds.filter((id) => id !== taskId)
      : sourceIds.length >= RECONCILE_LIMITS.sourceTasks
        ? sourceIds
        : [...sourceIds, taskId];
    if (next !== sourceIds) {
      setSourceIds(next);
      setContextIds((current) => current.filter((id) => !next.includes(id)));
      invalidate();
    }
  }

  function toggleContext(taskId: string): void {
    if (pending !== null) {
      return;
    }
    const next = contextIds.includes(taskId)
      ? contextIds.filter((id) => id !== taskId)
      : contextIds.length >= RECONCILE_LIMITS.contextTasks
        ? contextIds
        : [...contextIds, taskId];
    if (next !== contextIds) {
      setContextIds(next);
      invalidate();
    }
  }

  function buildPreview(): void {
    if (pending !== null) {
      return;
    }
    const plan = planFor(tasks, sourceIds, contextIds);
    if (plan.status === "invalid") {
      invalidate();
      setStatus({ tone: "error", message: describePlanFailure(plan.code) });
      return;
    }
    if (plan.status === "context_selection_required") {
      invalidate();
      setStatus({
        tone: "error",
        message: `There are ${plan.eligibleContextIds.length} other tasks. Choose at most 20 context tasks before previewing.`,
      });
      return;
    }
    setPreview(plan.preview);
    setConsent(null);
    setResult(null);
    setStatus({
      tone: "info",
      message: "This preview is local. Approve exactly this packet to make one explicit request.",
    });
  }

  async function rebuildFresh(
    sources: readonly string[],
    contexts: readonly string[],
  ): Promise<ReconciliationPreview | null> {
    const fresh = await onReadFreshTasks();
    const plan = planFor(fresh, sources, contexts);
    return plan.status === "ready" ? plan.preview : null;
  }

  async function send(): Promise<void> {
    if (
      preview === null ||
      consent === null ||
      pending !== null ||
      provider.status !== "ready"
    ) {
      return;
    }
    const token = ++operation.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setPending("send");
    setStatus({ tone: "pending", message: "Sending one cloud request with the approved packet..." });
    try {
      const freshPreview = await rebuildFresh(sourceIds, contextIds);
      if (!mounted.current || operation.current !== token) {
        return;
      }
      if (freshPreview === null || consentStatus(consent, freshPreview) !== "valid") {
        invalidate("The approved packet is stale. Nothing was sent; preview again for fresh consent.");
        return;
      }
      const response = await provider.generate(consent.packetText, nextController.signal);
      if (!mounted.current || operation.current !== token) {
        return;
      }
      // A context change during the request discards the late result instead of applying it.
      const finalPreview = await rebuildFresh(sourceIds, contextIds);
      if (!mounted.current || operation.current !== token) {
        return;
      }
      if (finalPreview === null || finalPreview.packetText !== consent.packetText) {
        invalidate(
          "Shared tasks changed while the request was in flight, so the result was discarded. Nothing was written.",
        );
        return;
      }
      const parsed = validateReconcileOutput(response.text, finalPreview.packet);
      setPreview(finalPreview);
      setConsent(null);
      setResult(parsed);
      setStatus({
        tone: "info",
        message: `${parsed.suggestions.length} suggestion${parsed.suggestions.length === 1 ? "" : "s"} returned. Nothing is written until you confirm one.`,
      });
    } catch (error) {
      if (!mounted.current || operation.current !== token) {
        return;
      }
      // One-shot consent: a failed attempt is never retried automatically.
      setConsent(null);
      setStatus({ tone: "error", message: describeCloudFailure(error) });
    } finally {
      if (mounted.current && operation.current === token) {
        setPending(null);
        controller.current = null;
      }
    }
  }

  function cancel(): void {
    if (pending !== "send") {
      return;
    }
    operation.current += 1;
    controller.current?.abort();
    controller.current = null;
    setPending(null);
    setConsent(null);
    setStatus({
      tone: "info",
      message: "Request canceled. Nothing was written and no retry was sent; a late result is discarded.",
    });
  }

  async function confirm(suggestion: ReconcileSuggestion): Promise<void> {
    if (pending !== null) {
      return;
    }
    const token = ++operation.current;
    setPending("confirm");
    setStatus({
      tone: "pending",
      message: "Checking the current versions, then recording one observation...",
    });
    try {
      const fresh = await onReadFreshTasks();
      if (!mounted.current || operation.current !== token) {
        return;
      }
      const source = fresh.find((task) => task.id === suggestion.taskId);
      const target = fresh.find((task) => task.id === suggestion.targetTaskId);
      if (
        source === undefined ||
        target === undefined ||
        source.version !== suggestion.taskVersion ||
        target.version !== suggestion.targetVersion
      ) {
        invalidate();
        setStatus({
          tone: "error",
          message:
            "Conflict: the shared tasks changed since this suggestion, so nothing was written. Refresh and preview again.",
        });
        return;
      }
      await onConfirmObservation(source.id, observationCommandFor(suggestion, uid, role));
      if (!mounted.current || operation.current !== token) {
        return;
      }
      invalidate();
      setStatus({
        tone: "confirmed",
        message:
          "Observation recorded at the next source version. Its state, owner and the target task are unchanged.",
      });
    } catch (error) {
      if (!mounted.current || operation.current !== token) {
        return;
      }
      setStatus({ tone: "error", message: describeFailure(error) });
    } finally {
      if (mounted.current && operation.current === token) {
        setPending(null);
      }
    }
  }

  function dismiss(suggestion: ReconcileSuggestion): void {
    setResult((current) =>
      current === null
        ? null
        : {
            brief: current.brief,
            suggestions: current.suggestions.filter((entry) => entry !== suggestion),
          },
    );
    setStatus({ tone: "info", message: "Suggestion dismissed. Nothing was written." });
  }

  const busy = pending !== null;
  const selectedContext = needsSelection ? contextIds.length : others.length;
  const canPreview =
    !busy && sourceIds.length > 0 && (!needsSelection || (contextIds.length > 0 && contextIds.length <= 20));

  function titleOf(taskId: string): string {
    const task = tasks.find((entry) => entry.id === taskId);
    return task?.title ?? taskId;
  }

  return (
    <section className="panel reconciliation-panel" aria-labelledby="reconciliation-heading">
      <div className="panel-heading">
        <p className="eyebrow">Optional - separately consented</p>
        <h2 id="reconciliation-heading">Cloud reconciliation</h2>
        <p className="panel-intro">
          Compares only shared tasks you choose for duplicates or contradictions. The preview is
          exact and local. One explicit approval makes at most one request, and suggestions never
          change a task.
        </p>
      </div>

      {provider.status === "notconfigured" ? (
        <p className="status status-info" role="status">
          {provider.reason}
        </p>
      ) : provider.label === "test-network-mock" ? (
        <p className="status status-info" role="status">
          TEST MOCK - not a real cloud request. These results exist only for automated tests.
        </p>
      ) : (
        <p className="fine-print">
          Model: {preview?.model ?? "gemini-3.5-flash-lite"} - mode ONLY_IN_CLOUD - App Check applies
          to the live request.
        </p>
      )}

      {comparable.length === 0 ? (
        <p className="empty-state">No open or accepted tasks are available to compare yet.</p>
      ) : (
        <>
          <fieldset className="card-fieldset">
            <legend>
              Source tasks ({sourceIds.length} of {RECONCILE_LIMITS.sourceTasks})
            </legend>
            <p className="fine-print">
              Choose up to {RECONCILE_LIMITS.sourceTasks} tasks to compare. Only their shared ID,
              version, title, detail and state are sent.
            </p>
            {comparable.map((task) => (
              <div key={task.id} className="checkbox-row">
                <input
                  id={`source-${task.id}`}
                  type="checkbox"
                  checked={sourceIds.includes(task.id)}
                  onChange={() => toggleSource(task.id)}
                  disabled={
                    busy ||
                    (!sourceIds.includes(task.id) && sourceIds.length >= RECONCILE_LIMITS.sourceTasks)
                  }
                />
                <label htmlFor={`source-${task.id}`}>
                  Include {task.title} as a source task ({task.state}, version {task.version})
                </label>
              </div>
            ))}
          </fieldset>

          {needsSelection ? (
            <fieldset className="card-fieldset">
              <legend>
                Context tasks ({contextIds.length} of {RECONCILE_LIMITS.contextTasks} chosen)
              </legend>
              <p className="field-help">
                {others.length} other open or accepted tasks exist, more than the 20 this request
                can carry. Choose the 20 or fewer you want compared; the rest are visibly not sent.
              </p>
              {others.map((task) => (
                <div key={task.id} className="checkbox-row">
                  <input
                    id={`context-${task.id}`}
                    type="checkbox"
                    checked={contextIds.includes(task.id)}
                    onChange={() => toggleContext(task.id)}
                    disabled={
                      busy ||
                      (!contextIds.includes(task.id) &&
                        contextIds.length >= RECONCILE_LIMITS.contextTasks)
                    }
                  />
                  <label htmlFor={`context-${task.id}`}>
                    Include {task.title} as context ({task.state}, version {task.version})
                  </label>
                </div>
              ))}
            </fieldset>
          ) : (
            <p className="fine-print">
              All {others.length} other open or accepted task{others.length === 1 ? "" : "s"} are
              included as context. Nothing else from the venue is read or sent.
            </p>
          )}

          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={buildPreview}
              disabled={!canPreview}
            >
              Preview exact cloud packet
            </button>
            {pending === "send" && (
              <button type="button" className="button button-quiet" onClick={cancel}>
                Cancel request
              </button>
            )}
          </div>
        </>
      )}

      {status !== null && (
        <p
          className={`status status-${status.tone}`}
          role={status.tone === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      )}

      {preview !== null && (
        <section className="review-panel" aria-labelledby="cloud-preview-heading">
          <h3 id="cloud-preview-heading">Exact outgoing packet (not sent yet)</h3>
          <p>
            Model: <strong>{preview.model}</strong> - mode ONLY_IN_CLOUD
          </p>
          <p>Recipient purpose: {preview.purpose}</p>
          <details>
            <summary>System instruction</summary>
            <pre className="cloud-packet">{preview.systemInstruction}</pre>
          </details>
          <pre className="cloud-packet" data-testid="cloud-packet">
            {preview.packetText}
          </pre>
          <p className="byte-note">
            {utf8Bytes(preview.packetText)} UTF-8 bytes - {preview.packet.sources.length} source task
            {preview.packet.sources.length === 1 ? "" : "s"} - {preview.packet.context.length} context
            task{preview.packet.context.length === 1 ? "" : "s"} - {selectedContext} eligible context
            task{selectedContext === 1 ? "" : "s"} visible in this preview
          </p>
          <div className="checkbox-row">
            <input
              id="cloud-approval"
              type="checkbox"
              checked={consent !== null}
              onChange={(event) =>
                setConsent(event.target.checked ? createCloudConsent(preview) : null)
              }
              disabled={busy || provider.status !== "ready"}
            />
            <label htmlFor="cloud-approval">
              I approve exactly this packet and one cloud request
            </label>
          </div>
          {provider.status === "ready" ? (
            <div className="button-row">
              <button
                type="button"
                className="button button-primary"
                onClick={() => void send()}
                disabled={consent === null || busy}
              >
                {pending === "send" ? "Waiting for the cloud model..." : "Send one cloud request"}
              </button>
            </div>
          ) : (
            <p className="fine-print">
              Sending is unavailable in this build, so this approval cannot cause a request.
            </p>
          )}
          <p className="fine-print">
            Any edit, context change, cancel or sign-out invalidates this approval. A stale or late
            result is discarded, never applied.
          </p>
        </section>
      )}

      {result !== null && (
        <section className="review-panel" aria-labelledby="cloud-result-heading">
          <h3 id="cloud-result-heading">Model suggestions (nothing written)</h3>
          <p>{result.brief === "" ? "No brief was returned." : result.brief}</p>
          {result.suggestions.length === 0 ? (
            <p className="fine-print">The model reported no duplicate or contradiction.</p>
          ) : (
            <ol className="review-list">
              {result.suggestions.map((entry, index) => (
                <li key={`${entry.taskId}-${entry.targetTaskId}-${index}`}>
                  <h4>
                    {entry.kind === "duplicate" ? "Possible duplicate" : "Possible contradiction"}:{" "}
                    {titleOf(entry.taskId)} / {titleOf(entry.targetTaskId)}
                  </h4>
                  <p>{entry.rationale}</p>
                  <p className="byte-note">
                    {entry.taskId} v{entry.taskVersion} vs {entry.targetTaskId} v
                    {entry.targetVersion}
                  </p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => void confirm(entry)}
                      disabled={busy}
                    >
                      Confirm observation for {titleOf(entry.taskId)}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => dismiss(entry)}
                      disabled={busy}
                    >
                      Dismiss suggestion
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="fine-print">
            Confirming records one observation on the source task at its current version. It does
            not merge, close, reassign or resolve anything. Dismissing writes nothing.
          </p>
        </section>
      )}
    </section>
  );
}
