/**
 * Utility for robust parsing of LLM JSON outputs.
 * Handles markdown fences, preamble/postamble text, smart quotes,
 * trailing commas, unquoted array items (common in non-English responses like Bengali),
 * and raw control characters.
 */
export function safeParseJson<T = any>(raw: string, fallback?: T): T {
  if (!raw || typeof raw !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty or non-string input provided to safeParseJson');
  }

  let text = raw.replace(/```(?:json)?/gi, '').trim();

  // Extract from first { or [ to last } or ]
  const firstBrace = text.search(/[{\[]/);
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(text) as T;
  } catch (e1: any) {
    let repaired = text;

    // 2. Normalize smart quotes into standard ASCII quotes
    repaired = repaired.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"');
    repaired = repaired.replace(/[\u2018\u2019]/g, "'");

    // 3. Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(repaired) as T;
    } catch (e2) {}

    // 4. Fix unquoted multiline array items (common in Bengali/Hindi/multilingual LLM outputs)
    // Matches arrays containing lines without quotes: [ \n text \n ]
    repaired = repaired.replace(/\[\s*([^"\[\]{}]+?)\s*\]/gs, (match, content) => {
      const trimmed = content.trim();
      if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return match;
      const lines = content.split('\n')
        .map((l: string) => l.trim().replace(/^,\s*|,\s*$/g, ''))
        .filter(Boolean);
      const quoted = lines.map((line: string) => {
        if (line.startsWith('"') && line.endsWith('"')) return line;
        return JSON.stringify(line.replace(/^["']|["']$/g, ''));
      });
      return `[\n    ${quoted.join(',\n    ')}\n  ]`;
    });

    try {
      return JSON.parse(repaired) as T;
    } catch (e3) {}

    // 5. Replace raw newlines / tabs inside string literals
    repaired = repaired.replace(/:\s*"([^"]*)"/g, (_match, group) => {
      const sanitized = group.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
      return `: "${sanitized}"`;
    });

    try {
      return JSON.parse(repaired) as T;
    } catch (e4) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Failed to parse LLM JSON response: ${e1.message}\nRaw text snippet: ${text.substring(0, 250)}...`);
    }
  }
}
