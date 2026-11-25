/**
 * Manual-preview seed for the local emulators. Synthetic users only; passwords are
 * generated at runtime and printed once. Guarded to demo-shiftrelay on 127.0.0.1.
 */
import { randomBytes } from "node:crypto";

const PROJECT_ID = "demo-shiftrelay";
const HOST = "127.0.0.1";
const VENUE = "venue-hall-01";
const AUTH_ORIGIN = `http://${HOST}:9099`;
const FIRESTORE_ORIGIN = `http://${HOST}:8080`;
const DOCUMENTS = `${FIRESTORE_ORIGIN}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function createUser(role, label) {
  const password = randomBytes(18).toString("base64url");
  const email = `shiftrelay.${label}.${Date.now()}@example.invalid`;
  const response = await fetch(
    `${AUTH_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${PROJECT_ID}-local-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(`Auth emulator rejected the seed user (${response.status})`);
  }
  const body = await response.json();
  const membership = await fetch(
    `${DOCUMENTS}/venues/${VENUE}/members/${body.localId}`,
    {
      method: "PATCH",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: body.localId },
          venueId: { stringValue: VENUE },
          role: { stringValue: role },
        },
      }),
    },
  );
  if (!membership.ok) {
    throw new Error(`Firestore emulator rejected membership (${membership.status})`);
  }
  return { email, password, role };
}

try {
  const outgoing = await createUser("outgoing", "outgoing");
  const incoming = await createUser("incoming", "incoming");
  console.log("ShiftRelay local demo accounts (synthetic, emulator only):");
  for (const account of [outgoing, incoming]) {
    console.log(`  ${account.role}: ${account.email}`);
    console.log(`    password: ${account.password}`);
  }
  console.log("These credentials exist only in the local Auth emulator and are not saved.");
} catch (error) {
  console.error(
    "Seed failed. Start the emulators first with `npm run emulators`, then run `npm run seed:emulator`.",
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
