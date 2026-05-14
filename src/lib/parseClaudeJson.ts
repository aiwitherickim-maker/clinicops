/**
 * Robustly parse a JSON response from Claude.
 *
 * Claude sometimes wraps output in markdown fences even when instructed not to.
 * This helper strips common wrappers before parsing so agents never fall back
 * to their defaults due to cosmetic formatting.
 */
export function parseClaudeJson<T>(raw: string): T {
  let text = raw.trim();

  // Strip leading ```json or ``` fence
  text = text.replace(/^```(?:json)?\s*/i, '');

  // Strip trailing ```
  text = text.replace(/```\s*$/, '').trim();

  // If there's extra text before the JSON object/array, extract just the JSON
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  const firstBrace =
    objStart === -1 ? arrStart :
    arrStart === -1 ? objStart :
    Math.min(objStart, arrStart);

  if (firstBrace > 0) {
    text = text.slice(firstBrace);
  }

  // Strip trailing non-JSON text after the closing brace/bracket
  const lastObj  = text.lastIndexOf('}');
  const lastArr  = text.lastIndexOf(']');
  const lastBrace = Math.max(lastObj, lastArr);
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1);
  }

  return JSON.parse(text) as T;
}
