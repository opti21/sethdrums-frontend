import { defineConfig } from "prisma/config";

// The app talks to Turso through the libSQL driver adapter at runtime
// (lib/prisma.ts). This file only drives `prisma generate`.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
