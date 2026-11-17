/**
 * Local-only Firebase wiring. This build refuses a non-demo project, a non-local page
 * origin or a non-local emulator host, so no production Firebase endpoint can be reached.
 * Auth persists only in memory and Firestore uses a memory cache: no credential or
 * private draft survives a reload, sign-out or member revocation.
 */
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, initializeAuth, inMemoryPersistence } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

const DEMO_PROJECT_ID = "demo-shiftrelay";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function readConfig(): { projectId: string; emulatorHost: string } {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? DEMO_PROJECT_ID;
  const emulatorHost = import.meta.env.VITE_EMULATOR_HOST ?? "127.0.0.1";
  if (projectId !== DEMO_PROJECT_ID) {
    throw new Error("ShiftRelay local build refuses a non-demo Firebase project");
  }
  if (!LOCAL_HOSTS.has(emulatorHost)) {
    throw new Error("ShiftRelay local build refuses a non-local emulator host");
  }
  if (typeof location !== "undefined" && !LOCAL_HOSTS.has(location.hostname)) {
    throw new Error("ShiftRelay local build refuses a non-local page origin");
  }
  return { projectId, emulatorHost };
}

const config = readConfig();

export const app = initializeApp(
  {
    projectId: config.projectId,
    apiKey: "demo-shiftrelay-local-key",
    authDomain: `${config.emulatorHost}:9099`,
    appId: "demo-shiftrelay-local-app",
  },
  { automaticDataCollectionEnabled: false },
);

export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });

connectAuthEmulator(auth, `http://${config.emulatorHost}:9099`, { disableWarnings: true });
connectFirestoreEmulator(db, config.emulatorHost, 8080);
