/**
 * Application shell: real Auth emulator session, membership-derived role, explicit
 * publication, and server-confirmed ownership actions. No role switch and no AI path.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import type { ReviewedCard, Task, TransitionCommand, TransitionResult } from "./domain";
import { auth, db } from "./firebase";
import { Handover, type ActionFeedback } from "./Handover";
import { PrivateDraft, type PublicationIds } from "./PrivateDraft";
import { CloudReconciliation } from "./CloudReconciliation";
import {
  createSessionGuard,
  describeFailure,
  describeSignInFailure,
  readActivities,
  readMembership,
  readTasks,
  VENUE_ID,
  VENUE_NAME,
  watchMembership,
  type ActivityView,
  type Membership,
} from "./session";
import { planPublication } from "./validation";
import {
  publishHandover,
  readPublication,
  runTaskTransition,
  type PublicationRead,
  type PublicationStatus,
} from "./tasks";

type Phase = "starting" | "signed-out" | "loading" | "ready" | "denied" | "error";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setMessage(describeSignInFailure(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy" aria-labelledby="signin-heading">
        <p className="eyebrow">ShiftRelay · local demonstration</p>
        <h1 id="signin-heading">Close the shift with accepted owners.</h1>
        <p className="lede">
          Private notes stay in this tab. A reviewed handover becomes shared tasks; the next shift
          accepts responsibility, records resolution, and can reopen unfinished work.
        </p>
        <ul className="principles">
          <li>Private note: memory only, never uploaded.</li>
          <li>Shared fields: explicitly reviewed before publication.</li>
          <li>Ownership: server-confirmed, never optimistic.</li>
        </ul>
      </section>

      <section className="auth-card" aria-labelledby="auth-form-heading">
        <h2 id="auth-form-heading">Sign in</h2>
        <p className="panel-intro">
          Accounts are provisioned by the venue administrator. This demo has no public sign-up.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" className="button button-primary button-wide" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {message !== null && (
          <p className="status status-error" role="alert">
            {message}
          </p>
        )}
        <p className="fine-print">
          Local Auth and Firestore emulators only. No production Firebase project is reachable from
          this build.
        </p>
      </section>
    </main>
  );
}

function WorkspaceHeader({
  user,
  membership,
  onSignOut,
}: {
  readonly user: User;
  readonly membership: Membership | null;
  readonly onSignOut: () => void;
}) {
  return (
    <header className="masthead">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          SR
        </span>
        <div>
          <p className="eyebrow">ShiftRelay</p>
          <h1>Shift handover</h1>
        </div>
      </div>
      <div className="identity">
        <span className="identity-email">{user.email ?? user.uid}</span>
        {membership !== null && (
          <span className={`role-badge role-${membership.role}`}>{membership.role}</span>
        )}
        <button type="button" className="button button-quiet" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const guard = useRef(createSessionGuard());
  const [phase, setPhase] = useState<Phase>("starting");
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState(0);

  const clearWorkspace = useCallback((): void => {
    setTasks([]);
    setActivities([]);
    setFeedback(null);
    setRefreshError(null);
    setLoadError(null);
    setMembership(null);
  }, []);

  const loadWorkspace = useCallback(
    async (uid: string, epoch: number): Promise<void> => {
      const loadedMembership = await readMembership(db, uid);
      if (!guard.current.current(epoch)) {
        return;
      }
      if (loadedMembership === null) {
        clearWorkspace();
        setPhase("denied");
        return;
      }
      setMembership(loadedMembership);
      const [loadedTasks, loadedActivities] = await Promise.all([readTasks(db), readActivities(db)]);
      if (!guard.current.current(epoch)) {
        return;
      }
      setTasks(loadedTasks);
      setActivities(loadedActivities);
      setPhase("ready");
    },
    [clearWorkspace],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const epoch = guard.current.invalidate();
      setSessionEpoch(epoch);
      clearWorkspace();
      setUser(nextUser);
      if (nextUser === null) {
        setPhase("signed-out");
        return;
      }
      setPhase("loading");
      void loadWorkspace(nextUser.uid, epoch).catch((error: unknown) => {
        if (!guard.current.current(epoch)) {
          return;
        }
        setLoadError(describeFailure(error));
        setPhase("error");
      });
    });
    return unsubscribe;
  }, [clearWorkspace, loadWorkspace]);

  useEffect(() => {
    if (user === null) {
      return;
    }
    const unsubscribe = watchMembership(
      db,
      user.uid,
      (nextMembership) => {
        if (nextMembership === null) {
          guard.current.invalidate();
          clearWorkspace();
          setPhase("denied");
          return;
        }
        setMembership(nextMembership);
      },
      (error) => {
        guard.current.invalidate();
        clearWorkspace();
        setLoadError(describeFailure(error));
        setPhase("denied");
      },
    );
    return unsubscribe;
  }, [user, clearWorkspace]);

  async function refresh(): Promise<void> {
    const epoch = guard.current.snapshot();
    setRefreshing(true);
    setRefreshError(null);
    try {
      const [nextTasks, nextActivities] = await Promise.all([readTasks(db), readActivities(db)]);
      if (!guard.current.current(epoch)) {
        return;
      }
      setTasks(nextTasks);
      setActivities(nextActivities);
    } catch (error) {
      if (!guard.current.current(epoch)) {
        return;
      }
      setRefreshError(describeFailure(error));
    } finally {
      if (guard.current.current(epoch)) {
        setRefreshing(false);
      }
    }
  }

  async function act(
    task: Task,
    action: "accept" | "resolve" | "reopen",
    text?: string,
  ): Promise<boolean> {
    if (user === null || membership === null || membership.role !== "incoming") {
      return false;
    }
    const epoch = guard.current.snapshot();
    setFeedback({ taskId: task.id, tone: "pending", message: "Sending… waiting for server acknowledgment." });
    let command: TransitionCommand;
    if (action === "accept") {
      command = {
        action,
        actorId: user.uid,
        actorRole: membership.role,
        expectedVersion: task.version,
      };
    } else if (action === "resolve") {
      command = {
        action,
        actorId: user.uid,
        actorRole: membership.role,
        expectedVersion: task.version,
        resolution: text ?? "",
      };
    } else {
      command = {
        action,
        actorId: user.uid,
        actorRole: membership.role,
        expectedVersion: task.version,
        reason: text ?? "",
      };
    }
    try {
      const result: TransitionResult = await runTaskTransition(db, VENUE_ID, task.id, command);
      if (!guard.current.current(epoch)) {
        return false;
      }
      setTasks((current) => current.map((entry) => (entry.id === result.task.id ? result.task : entry)));
      setActivities((current) => [
        ...current.filter((entry) => entry.id !== result.activity.id),
        { ...result.activity, at: null },
      ]);
      setFeedback({
        taskId: task.id,
        tone: "confirmed",
        message:
          action === "accept"
            ? "Accepted. The server recorded you as owner at the next version."
            : action === "resolve"
              ? "Resolved. The server recorded the resolution and history."
              : "Reopened. The owner is unchanged and the previous resolution remains in history.",
      });
      void refresh();
      return true;
    } catch (error) {
      if (!guard.current.current(epoch)) {
        return false;
      }
      setFeedback({ taskId: task.id, tone: "error", message: describeFailure(error) });
      return false;
    }
  }

  async function publish(
    cards: readonly ReviewedCard[],
    ids: PublicationIds,
  ): Promise<PublicationStatus> {
    if (user === null || membership?.role !== "outgoing") {
      throw new Error("publication not permitted");
    }
    const plan = planPublication(
      { cards },
      {
        venueId: VENUE_ID,
        handoverId: ids.handoverId,
        creatorId: user.uid,
        taskIds: [...ids.taskIds],
      },
    );
    const status = await publishHandover(db, plan);
    void refresh();
    return status;
  }

  function check(ids: PublicationIds): Promise<PublicationRead> {
    return readPublication(db, VENUE_ID, ids.handoverId, ids.taskIds);
  }

  /** Human-confirmed cloud suggestion: one ordinary observation, never a merge or owner change. */
  async function confirmObservation(taskId: string, command: TransitionCommand): Promise<void> {
    if (user === null || membership === null) {
      throw new Error("not signed in");
    }
    const epoch = guard.current.snapshot();
    const result = await runTaskTransition(db, VENUE_ID, taskId, command);
    if (!guard.current.current(epoch)) {
      return;
    }
    setTasks((current) => current.map((entry) => (entry.id === result.task.id ? result.task : entry)));
    setActivities((current) => [
      ...current.filter((entry) => entry.id !== result.activity.id),
      { ...result.activity, at: null },
    ]);
    void refresh();
  }

  async function handleSignOut(): Promise<void> {
    guard.current.invalidate();
    clearWorkspace();
    setUser(null);
    setPhase("signed-out");
    await signOut(auth);
  }

  const isCurrent = () => guard.current.current(sessionEpoch);

  if (phase === "starting") {
    return (
      <main className="centered-state">
        <p className="eyebrow">ShiftRelay</p>
        <p role="status">Starting the local workspace…</p>
      </main>
    );
  }

  if (phase === "signed-out" || user === null) {
    return (
      <div className="app-shell">
        <SignInForm />
        <footer className="site-footer">
          <p>Local demonstration · synthetic data · Firebase emulators only</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <WorkspaceHeader user={user} membership={membership} onSignOut={() => void handleSignOut()} />
      <main id="workspace" className="workspace-main">
        <div className="venue-strip">
          <div>
            <p className="eyebrow">One venue · one shift handover</p>
            <h2>{VENUE_NAME}</h2>
          </div>
          <p className="venue-note">
            {membership?.role === "outgoing"
              ? "You are signed in as outgoing. Draft privately, review, then share."
              : membership?.role === "incoming"
                ? "You are signed in as incoming. Accept open work and record outcomes."
                : "Checking venue access…"}
          </p>
        </div>

        {phase === "loading" && (
          <p className="status status-pending" role="status">
            Loading venue access and shared tasks…
          </p>
        )}

        {phase === "denied" && (
          <section className="panel" aria-labelledby="denied-heading">
            <h2 id="denied-heading">No venue access</h2>
            <p>
              This account has no current membership at {VENUE_NAME}. Access may have been revoked.
              Private and shared content has been cleared from this tab.
            </p>
            <p className="fine-print">
              Ask the venue administrator to provision membership, then sign in again.
            </p>
            <button type="button" className="button button-primary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </section>
        )}

        {phase === "error" && (
          <section className="panel" aria-labelledby="error-heading">
            <h2 id="error-heading">Shared workspace unavailable</h2>
            <p className="status status-error" role="alert">
              {loadError ?? "The local emulator could not be read."}
            </p>
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={() => void refresh()}>
                Try again
              </button>
              <button type="button" className="button button-secondary" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </div>
          </section>
        )}

        {phase === "ready" && membership !== null && (
          <div className="workspace-grid">
            {membership.role === "outgoing" ? (
              <PrivateDraft onPublish={publish} onCheck={check} isCurrent={isCurrent} />
            ) : (
              <section className="panel incoming-panel" aria-labelledby="incoming-heading">
                <p className="eyebrow">Incoming shift</p>
                <h2 id="incoming-heading">Take responsibility explicitly</h2>
                <p className="panel-intro">
                  Open tasks are unassigned. Accept one to become its named owner; resolve it with a
                  recorded resolution; reopen it with a reason if the work is not finished.
                </p>
                <p className="fine-print">
                  Only an outgoing volunteer can publish. This screen cannot switch your role.
                </p>
              </section>
            )}
            <Handover
              tasks={tasks}
              activities={activities}
              uid={user.uid}
              role={membership.role}
              feedback={feedback}
              refreshing={refreshing}
              refreshError={refreshError}
              onAction={act}
              onRefresh={() => void refresh()}
            />
            <CloudReconciliation
              tasks={tasks}
              uid={user.uid}
              role={membership.role}
              onReadFreshTasks={() => readTasks(db)}
              onConfirmObservation={confirmObservation}
            />
          </div>
        )}
      </main>
      <footer className="site-footer">
        <p>Local demonstration · synthetic data · Firebase emulators only</p>
        <p>Raw notes stay in this tab. Shared fields require explicit review.</p>
      </footer>
    </div>
  );
}
