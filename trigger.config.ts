import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_qgdyfolimghfqbrcheks",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  build: {
    external: ["@prisma/client"],
  },
});