"use client";

// Reusable popover container.
//
// Renders the popover into a React Portal at document.body so it always
// floats above everything else (sticky bars, hotel cards with transforms,
// next sections, etc.) and can never be clipped by an ancestor's
// stacking context. Position is computed from the trigger's bounding rect
// so the popover follows the trigger across scrolls and resizes.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placePopover, type Rect } from "@/lib/popover";

type Props = {
  /** Element used to position the popover (typically the trigger button). */
  anchorRef: React.RefObject<HTMLElement>;
  /** Whether the popover is currently visible. */
  open: boolean;
  /** Called when the user dismisses (outside click / Escape). */
  onClose: () => void;
  /** Body of the popover. */
  children: React.ReactNode;
  /** Horizontal alignment relative to the anchor. */
  align?: "start" | "end";
  /** Width of the popover. Used both for layout and for placement math. */
  widthPx?: number;
  /** Optional id for aria. */
  id?: string;
  /** Optional aria-label. */
  ariaLabel?: string;
};

export function Popover({
                          anchorRef,
                          open,
                          onClose,
                          children,
                          align = "end",
                          widthPx = 340,
                          id,
                          ariaLabel,
                        }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const fallbackId = useId();
  const dialogId = id ?? fallbackId;

  // Defer createPortal until the client mounts (avoids SSR mismatch).
  useEffect(() => {
    setMounted(true);
  }, []);

  // Recalculate position whenever the popover opens, on scroll, or on resize.
  const recalc = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;
    const aRect = anchor.getBoundingClientRect();
    const rect: Rect = {
      top: aRect.top, left: aRect.left, right: aRect.right, bottom: aRect.bottom,
      width: aRect.width, height: aRect.height,
    };
    const size = {
      width: popover.offsetWidth || widthPx,
      height: popover.offsetHeight,
    };
    const placement = placePopover(rect, size, { width: window.innerWidth, height: window.innerHeight }, align);
    setCoords({ top: placement.top, left: placement.left });
  }, [anchorRef, align, widthPx]);

  useLayoutEffect(() => {
    if (!open) return;
    recalc();
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => recalc();
    const onResize = () => recalc();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, recalc]);

  // Outside-click + Escape to close.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!mounted || !open) return null;

  // First render: invisible until measured to avoid a single-frame jump.
  const style: React.CSSProperties = {
    position: "fixed",
    top: coords?.top ?? -9999,
    left: coords?.left ?? -9999,
    width: widthPx,
    visibility: coords ? "visible" : "hidden",
    zIndex: 1000,
  };

  return createPortal(
          <div
                  ref={popoverRef}
                  id={dialogId}
                  role="dialog"
                  aria-label={ariaLabel}
                  style={style}
                  className="bg-cream text-ink border border-ink/15 shadow-2xl shadow-black/30"
          >
            {children}
          </div>,
          document.body,
  );
}
