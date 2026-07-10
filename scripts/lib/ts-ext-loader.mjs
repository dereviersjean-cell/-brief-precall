// Node's native TS type-stripping (--experimental-strip-types) requires
// explicit file extensions on every specifier, and knows nothing of
// Next.js's "@/" path alias (tsconfig "paths": {"@/*": ["./*"]}) — but this
// codebase's lib/*.ts files use both extension-less relative imports and
// "@/..." imports throughout (fine for Next.js's own bundler, not for
// Node's ESM resolver run standalone). This hook lets one-off scripts under
// scripts/ import the real lib/*.ts modules directly — instead of
// copy-pasting their logic — by (1) mapping "@/..." to the project root and
// (2) retrying a failed extension-less relative resolution with ".ts"
// appended. Only used for local backfill/maintenance scripts, never by the
// app itself.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const withoutExt = path.join(PROJECT_ROOT, specifier.slice(2));
    const candidate = /\.[a-zA-Z0-9]+$/.test(withoutExt) ? withoutExt : `${withoutExt}.ts`;
    return nextResolve(pathToFileURL(candidate).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        // fall through to the original error below
      }
    }
    throw err;
  }
}
