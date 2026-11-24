/**
 * Shared task queue and recorded history. The UI never renders a transition as confirmed
 * before the server acknowledges it, and never offers a role toggle.
 */
import { useEffect, useRef, useState } from "react";
import type { Role, Task } from "./domain";
import type { ActivityView } from "./session";
import { utf8Bytes } from "./validation";

export interface ActionFeedback {
  readonly taskId: string;
  readonly tone: "pending" | "confirmed" | "error";
  readonly message: string;
}

interface HandoverProps {
  readonly tasks: readonly Task[];
  readonly activities: readonly ActivityView[];
  readonly uid: string;
  readonly role: Role;
  readonly feedback: ActionFeedback | null;
  readonly refreshing: boolean;
  readonly refreshError: string | null;
  readonly onAction: (
    task: Task,
    action: "accept" | "resolve" | "reopen",
    text?: string,
  ) => Promise<boolean>;
  readonly onRefresh: () => void;
}

interface OpenForm {
  readonly taskId: string;
  readonly action: "resolve" | "reopen";
}

const STATE_LABEL = {
  open: "Open · unassigned",
  accepted: "Accepted",
  resolved: "Resolved",
} as const;

function formatTime(activity: ActivityView): string {
  if (activity.at === null) {
    return `v${activity.toVersion}`;
  }
  return `${activity.at.toDate().toLocaleString()} · v${activity.toVersion}`;
}

function describeActivity(activity: ActivityView, uid: string): string {
  const actor = activity.actorId === uid ? "you" : "another member";
  switch (activity.action) {
    case "create":
      return "Published as an open task";
    case "accept":
      return `Accepted by ${actor}`;
    case "resolve":
      return `Resolved by ${actor}`;
    case "reopen":
      return `Reopened by ${actor}`;
    case "observe":
      return `Observation recorded by ${actor}`;
  }
}

export function Handover({
  tasks,
  activities,
  uid,
  role,
  feedback,
  refreshing,
  refreshError,
  onAction,
  onRefresh,
}: HandoverProps) {
  const [form, setForm] = useState<OpenForm | null>(null);
  const [text, setText] = useState("");
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterSubmit = useRef<{ taskId: string; state: Task["state"] } | null>(null);

  const pending = feedback?.tone === "pending";

  // Resolve/reopen replace the trigger; wait until the task state that renders the surviving
  // trigger has committed before focusing it, so the focus cannot land on the removed button.
  useEffect(() => {
    const target = focusAfterSubmit.current;
    if (target === null || form !== null) {
      return;
    }
    if (!tasks.some((task) => task.id === target.taskId && task.state === target.state)) {
      return;
    }
    focusAfterSubmit.current = null;
    triggerRefs.current.get(target.taskId)?.focus();
  }, [form, tasks]);

  function openForm(task: Task, action: "resolve" | "reopen"): void {
    setForm({ taskId: task.id, action });
    setText("");
  }

  function closeForm(): void {
    if (form === null) {
      return;
    }
    const taskId = form.taskId;
    setForm(null);
    setText("");
    requestAnimationFrame(() => triggerRefs.current.get(taskId)?.focus());
  }

  async function submitAccept(task: Task): Promise<void> {
    // Record before awaiting: the confirmed task state can commit before this promise resumes.
    focusAfterSubmit.current = { taskId: task.id, state: "accepted" };
    if (!(await onAction(task, "accept"))) {
      focusAfterSubmit.current = null;
    }
  }

  async function submitForm(task: Task, action: "resolve" | "reopen"): Promise<void> {
    const confirmed = await onAction(task, action, text);
    if (confirmed) {
      focusAfterSubmit.current = {
        taskId: task.id,
        state: action === "resolve" ? "resolved" : "accepted",
      };
      setForm(null);
      setText("");
    }
  }

  let textBytes: number | null = null;
  try {
    textBytes = utf8Bytes(text);
  } catch {
    textBytes = null;
  }
  const textLimit = form?.action === "reopen" ? 400 : 800;

  return (
    <section className="panel queue-panel" aria-labelledby="queue-heading">
      <div className="panel-heading queue-heading">
        <div>
          <p className="eyebrow">Shared workspace</p>
          <h2 id="queue-heading">Task queue</h2>
        </div>
        <button type="button" className="button button-secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh shared tasks"}
        </button>
      </div>
      <p className="panel-intro">
        {tasks.length === 0
          ? "No tasks have been published yet."
          : `${tasks.length} published task${tasks.length === 1 ? "" : "s"} with recorded history.`}
      </p>
      {refreshError !== null && (
        <p className="status status-error" role="alert">
          {refreshError}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="empty-state">
          {role === "outgoing"
            ? "Review and share cards from the private draft to start the handover."
            : "The outgoing volunteer has not shared any tasks yet."}
        </p>
      ) : (
        <ul className="task-list" role="list">
          {tasks.map((task) => {
            const history = activities.filter((activity) => activity.taskId === task.id);
            const taskFeedback = feedback?.taskId === task.id ? feedback : null;
            const busy = taskFeedback?.tone === "pending";
            const ownerLabel =
              task.ownerId === null
                ? "Unassigned"
                : task.ownerId === uid
                  ? "You"
                  : "Another incoming volunteer";
            return (
              <li key={task.id}>
                <article className={`task task-${task.state}`} aria-labelledby={`task-${task.id}-title`}>
                  <div className="task-topline">
                    <span className={`state-pill state-${task.state}`}>{STATE_LABEL[task.state]}</span>
                    <span className="version-tag">version {task.version}</span>
                  </div>
                  <h3 id={`task-${task.id}-title`}>{task.title}</h3>
                  {task.detail !== "" && <p className="task-detail">{task.detail}</p>}
                  <p className="task-meta">
                    Owner: <strong>{ownerLabel}</strong>
                  </p>
                  {task.resolution !== null && (
                    <p className="task-resolution">
                      <span>Resolution:</span> {task.resolution}
                    </p>
                  )}

                  {role === "incoming" && task.state === "open" && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-primary"
                        aria-label={`Accept task: ${task.title}`}
                        onClick={() => void submitAccept(task)}
                        disabled={pending || busy}
                      >
                        {busy ? "Accepting…" : "Accept task"}
                      </button>
                    </div>
                  )}

                  {role === "incoming" && task.state === "accepted" && task.ownerId === uid && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-primary"
                        aria-label={`Resolve task: ${task.title}`}
                        onClick={() => openForm(task, "resolve")}
                        disabled={pending || busy}
                        ref={(node) => {
                          if (node === null) {
                            triggerRefs.current.delete(task.id);
                          } else {
                            triggerRefs.current.set(task.id, node);
                          }
                        }}
                      >
                        Resolve task
                      </button>
                    </div>
                  )}

                  {role === "incoming" && task.state === "resolved" && task.ownerId === uid && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary"
                        aria-label={`Reopen task: ${task.title}`}
                        onClick={() => openForm(task, "reopen")}
                        disabled={pending || busy}
                        ref={(node) => {
                          if (node === null) {
                            triggerRefs.current.delete(task.id);
                          } else {
                            triggerRefs.current.set(task.id, node);
                          }
                        }}
                      >
                        Reopen task
                      </button>
                    </div>
                  )}

                  {form !== null && form.taskId === task.id && (
                    <form
                      className="action-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitForm(task, form.action);
                      }}
                    >
                      <label className="field-label" htmlFor={`action-${task.id}`}>
                        {form.action === "resolve" ? "Resolution" : "Reason for reopening"}
                      </label>
                      <textarea
                        id={`action-${task.id}`}
                        className="input textarea"
                        rows={3}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        aria-describedby={`action-${task.id}-help`}
                      />
                      <p id={`action-${task.id}-help`} className="field-help">
                        {textBytes === null
                          ? "Invalid Unicode sequence. Retype the affected characters."
                          : `${textBytes} / ${textLimit} UTF-8 bytes`}
                      </p>
                      <div className="button-row">
                        <button
                          type="submit"
                          className="button button-primary"
                          disabled={pending || busy || textBytes === null}
                        >
                          {form.action === "resolve" ? "Confirm resolution" : "Confirm reopen"}
                        </button>
                        <button type="button" className="button button-secondary" onClick={closeForm}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {taskFeedback !== null && (
                    <p
                      className={`status status-${taskFeedback.tone}`}
                      role={taskFeedback.tone === "error" ? "alert" : "status"}
                    >
                      {taskFeedback.message}
                    </p>
                  )}

                  <details className="history" open={task.state !== "open"}>
                    <summary>
                      History <span className="history-count">({history.length})</span>
                    </summary>
                    {history.length === 0 ? (
                      <p className="fine-print">No activity recorded.</p>
                    ) : (
                      <ol className="history-list">
                        {history.map((activity) => (
                          <li key={activity.id}>
                            <p>{describeActivity(activity, uid)}</p>
                            <p className="history-meta">{formatTime(activity)}</p>
                            {activity.resolution !== null && (
                              <p className="history-detail">Resolution: {activity.resolution}</p>
                            )}
                            {activity.reason !== null && (
                              <p className="history-detail">Reopen reason: {activity.reason}</p>
                            )}
                            {activity.observation !== null && (
                              <p className="history-detail">
                                Observation ({activity.observation.kind}) of{" "}
                                {activity.observation.targetTaskId} v
                                {activity.observation.targetVersion}: {activity.observation.rationale}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </details>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
