/**
 * Utility for robust parsing of LLM JSON outputs.
 * Handles markdown fences, preamble/postamble text, smart quotes,
 * internal unescaped quotes, raw control characters/newlines,
 * unquoted array items (common in non-English responses like Hindi/Bengali),
 * missing outer braces, and truncated responses.
 */

export function repairJsonString(raw: string): string {
  if (!raw || typeof raw !== 'string') return '{}';

  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // If text starts with a property like "scenes": [ or "title": "...", wrap in { }
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    
    // Check if there is a colon before the first brace/bracket (e.g. "scenes": [ ... ])
    const colonIdx = text.indexOf(':');
    const firstOpener = (firstBrace !== -1 && firstBracket !== -1)
      ? Math.min(firstBrace, firstBracket)
      : (firstBrace !== -1 ? firstBrace : firstBracket);

    if (colonIdx !== -1 && (firstOpener === -1 || colonIdx < firstOpener)) {
      // Missing outer braces around key-value pairs
      text = '{' + text + '}';
    } else if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      text = text.substring(firstBrace);
    } else if (firstBracket !== -1) {
      text = text.substring(firstBracket);
    }
  }

  // Pre-pass: replace smart quotes with standard single quotes inside text
  // so they never clash with ASCII double quote delimiters
  text = text.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, "'");
  text = text.replace(/[\u2018\u2019]/g, "'");

  // Fix unquoted multiline array items (common in Bengali/Hindi/multilingual LLM outputs)
  text = text.replace(/\[\s*([^"\[\]{}]+?)\s*\]/gs, (match, content) => {
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

  // State machine scanner:
  // - Escapes raw newlines and tabs inside strings
  // - Escapes internal unescaped double quotes inside strings
  // - Tracks brackets/braces to ignore postamble text and close truncated structures
  let result = '';
  let inString = false;
  let escapeNext = false;
  const stack: ('{' | '[')[] = [];
  let rootEncountered = false;
  let rootClosed = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // If root object/array was already completely closed, ignore any trailing commentary/postamble
    if (rootClosed) {
      break;
    }

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        // Opening string quote
        inString = true;
        result += ch;
      } else {
        // We are inside a string. Check if this is a real closing quote or internal quote.
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r' || text[j] === '\n')) {
          j++;
        }

        const nextChar = text[j];

        // Legitimate closing quote triggers in JSON:
        // Followed by ':' (end of key)
        // Followed by ',' or '}' or ']' (end of value)
        // Or end of input
        const isLegitClosing =
          nextChar === undefined ||
          nextChar === ':' ||
          nextChar === ',' ||
          nextChar === '}' ||
          nextChar === ']';

        if (isLegitClosing) {
          inString = false;
          result += ch;
        } else {
          // Unescaped internal quote
          result += "\\\"";
        }
      }
      continue;
    }

    if (inString) {
      // Escape raw control characters
      if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        // skip \r
      } else if (ch === '\t') {
        result += '\\t';
      } else {
        result += ch;
      }
    } else {
      // Outside string
      if (ch === '{' || ch === '[') {
        rootEncountered = true;
        stack.push(ch);
        result += ch;
      } else if (ch === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
        result += ch;
        if (rootEncountered && stack.length === 0) {
          rootClosed = true;
        }
      } else if (ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
        result += ch;
        if (rootEncountered && stack.length === 0) {
          rootClosed = true;
        }
      } else {
        result += ch;
      }
    }
  }

  // If text ended while inside an unclosed string, close it
  if (inString) {
    result += '"';
  }

  // Clean trailing commas before closing braces/brackets
  result = result.replace(/,\s*([}\]])/g, '$1');

  // Remove any incomplete trailing key-value at the cutoff (e.g. `, "key":` or `, "key"`)
  result = result.replace(/,\s*"[^"]*"\s*:\s*$/g, '');
  result = result.replace(/,\s*"[^"]*"\s*$/g, '');
  result = result.replace(/,\s*$/g, '');

  // Close any unclosed structures in reverse order
  while (stack.length > 0) {
    const unclosed = stack.pop();
    if (unclosed === '{') {
      result += '}';
    } else if (unclosed === '[') {
      result += ']';
    }
  }

  // Final sweep for trailing commas
  result = result.replace(/,\s*([}\]])/g, '$1');

  return result;
}

export function safeParseJson<T = any>(raw: string, fallback?: T): T {
  if (!raw || typeof raw !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty or non-string input provided to safeParseJson');
  }

  let text = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 1. Direct parse attempt if already clean
  try {
    return JSON.parse(text) as T;
  } catch (e1: any) {
    // 2. Direct parse after stripping preamble/postamble (only if NOT missing outer braces)
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const colonIdx = text.indexOf(':');

    const firstOpener = (firstBrace !== -1 && firstBracket !== -1)
      ? Math.min(firstBrace, firstBracket)
      : (firstBrace !== -1 ? firstBrace : firstBracket);

    // If there is NO colon before the first opener, try slicing to last closer
    if (colonIdx === -1 || (firstOpener !== -1 && colonIdx > firstOpener)) {
      const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
      if (firstOpener !== -1 && lastBrace !== -1 && lastBrace > firstOpener) {
        const slice = text.substring(firstOpener, lastBrace + 1);
        try {
          return JSON.parse(slice) as T;
        } catch (e2) {}
      }
    }

    // 3. Robust state machine repair
    try {
      const repaired = repairJsonString(text);
      return JSON.parse(repaired) as T;
    } catch (e3: any) {
      // 4. Fallback or descriptive error
      if (fallback !== undefined) return fallback;
      throw new Error(
        `Failed to parse LLM JSON response: ${e1.message} (Repair error: ${e3.message})\nRaw text snippet: ${text.substring(0, 300)}...`
      );
    }
  }
}
