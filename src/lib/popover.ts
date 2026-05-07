// Pure popover positioning math. Given the anchor's bounding rect, the
// popover's intrinsic size, and the viewport size, compute where the
// popover should be placed (in viewport / fixed coordinates) so that:
//
//   • Its top edge sits just below the anchor's bottom edge.
//   • It horizontally aligns to the requested side (start = anchor.left,
//     end = anchor.right - popover.width) when there's room, and is
//     clamped inside the viewport otherwise.
//   • If there isn't enough room below the anchor, it flips above.
//
// All functions are deterministic and unit-tested in popover.test.ts.

export type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Viewport = { width: number; height: number };

export type Placement = {
  /** Final viewport-relative top (use as `style.top` with position: fixed). */
  top: number;
  /** Final viewport-relative left. */
  left: number;
  /** True if we flipped above the anchor because it didn't fit below. */
  flipped: boolean;
};

const GAP = 8;
const EDGE_MARGIN = 8;

/**
 * Compute the popover placement.
 *
 * @param anchor      The trigger element's bounding rect.
 * @param popover     The popover's intrinsic size.
 * @param viewport    The viewport size.
 * @param align       "start" anchors the popover's left edge to the anchor's
 *                    left edge; "end" aligns the right edges.
 */
export function placePopover(
        anchor: Rect,
        popover: Size,
        viewport: Viewport,
        align: "start" | "end" = "end",
): Placement {
  // Vertical: prefer below; if there isn't room AND there's more above, flip.
  const spaceBelow = viewport.height - anchor.bottom;
  const spaceAbove = anchor.top;
  const needs = popover.height + GAP + EDGE_MARGIN;
  const flipped = spaceBelow < needs && spaceAbove > spaceBelow;
  const top = flipped
          ? Math.max(EDGE_MARGIN, anchor.top - popover.height - GAP)
          // Defend against the case where popover is taller than the viewport —
          // pin to EDGE_MARGIN rather than letting the math return a negative.
          : Math.max(
                  EDGE_MARGIN,
                  Math.min(viewport.height - popover.height - EDGE_MARGIN, anchor.bottom + GAP),
          );

  // Horizontal: align as requested, then clamp.
  const idealLeft = align === "end"
          ? anchor.right - popover.width
          : anchor.left;
  const left = clamp(idealLeft, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.width - popover.width - EDGE_MARGIN));

  return { top, left, flipped };
}

/** Clamp helper; exposed for tests. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
