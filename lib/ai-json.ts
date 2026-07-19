// Shared JSON-extraction helper for routes that force a strict JSON contract
// on a Claude response (see CLAUDE.md "Génération IA — règles critiques").
// Originally lived only in app/api/tasks/[taskId]/generate-email/route.ts;
// extracted here so every JSON-generation route gets the same resilience
// instead of each reimplementing (or skipping) its own version.

// More resilient than a plain "strip ```json fences and hope the whole
// string is valid JSON" — a preamble/postamble around the fence (or around
// bare JSON) used to break JSON.parse outright. Isolates the {...} object
// regardless of what surrounds it, while staying a no-op for the common
// pure-JSON case.
export function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return cleaned;
  return sanitizeJsonControlChars(cleaned.slice(start, end + 1));
}

// Claude intermittently writes a literal newline inside a JSON string value
// instead of the escaped `\n`, which JSON.parse rejects outright ("Bad
// control character in string literal"). Walks the string tracking whether
// we're inside a JSON string (respecting `\"` and `\\` escapes) and escapes
// any raw control character found there — a no-op when the model already
// escaped correctly.
function sanitizeJsonControlChars(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
      out += ch;
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}
