import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests are pure and must never need an emulator. The rules suites live under
    // tests/rules and only run through `npm run test:rules` with an explicit emulator.
    include: ["tests/*.test.ts"],
  },
});
