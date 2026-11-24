import { defineConfig } from "knip/config";

export default defineConfig({
  entry: ["src/main.tsx!"],
  project: ["src/**/*.{ts,tsx}!"],
  include: [
    "dependencies",
    "unlisted",
    "binaries",
    "unresolved",
    "catalog",
    "catalogReferences",
    "exports",
    "nsExports",
    "types",
    "nsTypes",
    "enumMembers",
    "namespaceMembers",
    "duplicates",
    "files",
    "cycles",
  ],
  includeEntryExports: true,
  treatConfigHintsAsErrors: true,
  treatTagHintsAsErrors: true,
  rules: {
    cycles: "error",
  },
  ignoreExportsUsedInFile: {
    type: true,
    interface: true,
  },
});
