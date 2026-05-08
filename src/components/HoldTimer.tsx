"use client";

// 14-minute room-hold countdown shown next to the stay summary on the
// Complete Your Booking page. When the timer expires the guest is bounced
// back to the rate-list page so they can re-pick. Pure formatting logic
// lives in lib/bookingValidation (tested there).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatHoldTime, HOLD_DURATION_MINUTES } from "@/lib/bookingValidation";

const TICK_MS = 1000;

export function HoldTimer({ backToRatesHref }: { backToRatesHref: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(HOLD_DURATION_MINUTES * 60);

  useEffect(() => {
    if (remaining <= 0) {
      router.push(backToRatesHref);
      return;
    }
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [remaining, router, backToRatesHref]);

  const expired = remaining <= 0;
  const warning = remaining <= 60;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-sm ${
        expired ? "text-red-700" : warning ? "text-amber-700" : "text-ink/75"
      }`}
    >
      <ClockIcon />
      <span>
        Room(s) held for <strong className="font-mono">{formatHoldTime(remaining)}</strong>
      </span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
