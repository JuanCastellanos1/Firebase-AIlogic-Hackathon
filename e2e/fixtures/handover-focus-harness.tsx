/**
 * Browser mount for the deterministic accept-focus regression (verification §31).
 *
 * It renders the real, unchanged `src/Handover.tsx` and exposes the prop commits the spec needs to
 * force a commit order the application can produce. Nothing here is a production hook: the component
 * itself has no test-only path, and this module is only fetched by the page `focus-regression.spec.ts`
 * route-fills. The ordering mirrors the frozen outside-root RED fixture
 * (`Temp/opencode/shiftrelay-focus-red-fixture-ipv4-20261125/`).
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Handover } from "../../src/Handover";

const TASK_ID = "fixture-task-1";

const OPEN = {
  id: TASK_ID,
  venueId: "venue-fixture",
  handoverId: "handover-fixture",
  creatorId: "creator-fixture",
  title: "Fixture task",
  detail: "Fixture detail.",
  state: "open",
  ownerId: null,
  version: 1,
  resolution: null,
};

const ACCEPTED = { ...OPEN, state: "accepted", ownerId: "uid-incoming", version: 2 };

interface FixtureApi {
  readonly acceptedTask: typeof ACCEPTED;
  commit(patch: Record<string, unknown>): void;
  settleAccept(value: boolean): void;
}

declare global {
  interface Window {
    __fixture: FixtureApi;
  }
}

let props: Record<string, unknown> = {
  tasks: [OPEN],
  activities: [],
  uid: "uid-incoming",
  role: "incoming",
  feedback: null,
  refreshing: false,
  refreshError: null,
};

let settleAccept: ((value: boolean) => void) | null = null;

function onAction(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    settleAccept = resolve;
  });
}

function onRefresh(): void {
  // The spec drives refreshes through explicit prop commits, as the frozen fixture does.
}

const container = document.getElementById("root");
if (container === null) {
  throw new Error("focus harness root element missing");
}

const root = createRoot(container);

function draw(): void {
  root.render(createElement(Handover, { ...props, onAction, onRefresh } as never));
}

draw();

window.__fixture = {
  acceptedTask: ACCEPTED,
  commit(patch: Record<string, unknown>): void {
    props = { ...props, ...patch };
    draw();
  },
  settleAccept(value: boolean): void {
    settleAccept?.(value);
  },
};
