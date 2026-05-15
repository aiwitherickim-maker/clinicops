export { logHumanReviewEvent } from './db/humanReviewService';
export type { HumanReviewEventInput } from './db/humanReviewService';

export function computeTextDiff(
  originalText: string,
  finalText: string,
): Record<string, unknown> {
  const originalWords = originalText.trim().split(/\s+/).filter(Boolean);
  const finalWords    = finalText.trim().split(/\s+/).filter(Boolean);

  const originalSet = new Set(originalWords);
  const finalSet    = new Set(finalWords);

  return {
    wordsAdded:   finalWords.filter(w => !originalSet.has(w)).length,
    wordsRemoved: originalWords.filter(w => !finalSet.has(w)).length,
    lengthBefore: originalWords.length,
    lengthAfter:  finalWords.length,
    edited:       originalText.trim() !== finalText.trim(),
  };
}
