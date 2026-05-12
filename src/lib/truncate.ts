// Pure text-clamping helpers. Keeps SSR + client renders identical
// without dragging in a CSS line-clamp solution (which is fragile
// when fonts swap during hydration). Returns a word-boundary clip
// with an ellipsis, never mid-token.

const ELLIPSIS = "…";

/**
 * Clamp an excerpt to roughly `max` characters, breaking at the
 * last whitespace before the limit so words don't get sliced. Adds
 * an ellipsis only when the input was actually clipped. Falls
 * through gracefully on missing / empty input.
 */
export function truncateExcerpt(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  // Walk back to the last whitespace inside the limit to avoid
  // mid-word breaks. If there's no whitespace (one very long
  // token), fall through to a hard cut so we never overflow.
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[.,;:!?\s]+$/, "") + ELLIPSIS;
}
