// Node's native TS type-stripping (--experimental-strip-types) requires
// explicit file extensions on every specifier, but this codebase's lib/*.ts
// files use extension-less relative imports throughout (fine for Next.js's
// own bundler, not for Node's ESM resolver run standalone). This hook lets
// one-off scripts under scripts/ import the real lib/*.ts modules directly
// — instead of copy-pasting their logic — by retrying a failed resolution
// with ".ts" appended. Only used for local backfill/maintenance scripts,
// never by the app itself.
export async function resolve(specifier, context, nextResolve) {
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
