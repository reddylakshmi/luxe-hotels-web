"use client";

// Tiny popover that explains where the CVV lives on the back of a card.
// Trigger: a "?" button next to the CVV field.

import { useRef, useState } from "react";
import { Popover } from "./Popover";

export function CvvHelper() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink/10 text-ink/70 text-xs leading-none"
        aria-label="Where is my CVV?"
        aria-expanded={open}
      >
        ?
      </button>
      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
        <div className="bg-cream border border-ink/10 shadow-lg p-4 w-72">
          <CardBackSvg />
          <p className="mt-3 text-xs text-ink/75 leading-relaxed">
            <strong>Last 3 digits</strong> on the back of your card, on the signature
            strip. American Express cards use a 4-digit code on the front instead.
          </p>
        </div>
      </Popover>
    </>
  );
}

function CardBackSvg() {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="80" aria-hidden>
      <rect x="2" y="2" width="196" height="116" rx="8" fill="#f4ede0" stroke="#9a8a6a" />
      <rect x="0" y="20" width="200" height="22" fill="#1f1d1a" />
      <rect x="20" y="60" width="120" height="18" fill="#fff" stroke="#c5b89c" />
      <text
        x="155"
        y="74"
        fontFamily="monospace"
        fontSize="14"
        fill="#1f1d1a"
        textAnchor="middle"
      >
        123
      </text>
      <text x="155" y="92" fontFamily="sans-serif" fontSize="8" fill="#1f1d1a" textAnchor="middle">
        CVV
      </text>
    </svg>
  );
}
