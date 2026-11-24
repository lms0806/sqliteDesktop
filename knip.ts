import { defineConfig } from "knip/config";

export default defineConfig({
  entry: ["src/main.tsx!"],
  project: ["src/**/*.{ts,tsx,css}!"],
  compilers: {
    css: (source) =>
      Array.from(
        source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g),
        ([, specifier]) => `import ${JSON.stringify(specifier)};`,
      ).join("\n"),
  },
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
