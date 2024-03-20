import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10_000,
    coverage: {
      exclude: [...(configDefaults.coverage.exclude ?? []), "scripts/**"],
      provider: "istanbul",
    },
  },
});
