import { resetEmulator } from "./support";

export default async function globalSetup(): Promise<void> {
  await resetEmulator();
}
