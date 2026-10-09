import { defineConfig } from "vitest/config";
import path from "path";
const templateRoot = path.resolve(import.meta.dirname);
var vitest_config_default = defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets")
    }
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.js", "server/**/*.spec.js"]
  }
});
export {
  vitest_config_default as default
};
