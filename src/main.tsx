import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { describeRuntimeFailure } from "./runtimeConfig";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element missing");
}

const container = createRoot(root);

/**
 * `./App` (and with it `./firebase`) is imported dynamically so that a misconfigured or unsupported
 * origin renders an honest, closed failure instead of a blank page. Nothing is initialized when
 * configuration resolution rejects, so no Firebase endpoint is contacted.
 */
async function start(): Promise<void> {
  try {
    const { default: App } = await import("./App");
    container.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    container.render(
      <main className="centered-state">
        <p className="eyebrow">ShiftRelay</p>
        <h1>This build cannot start</h1>
        <p role="alert">{describeRuntimeFailure(error)}</p>
      </main>,
    );
  }
}

void start();
