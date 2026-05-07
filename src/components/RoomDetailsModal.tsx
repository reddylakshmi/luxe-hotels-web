"use client";

// Room-details modal opened from the "Room details →" link on a rate card.
// Renders full room metadata (size, beds, view, occupancy, description) in
// a centred dialog. Closes on backdrop click, Escape, or the X button.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { RoomAvailability } from "@/types/graphql";

export function RoomDetailsModal({
  room,
  hotelName,
  onClose,
}: {
  room: RoomAvailability["roomType"];
  hotelName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const beds = room.bedConfiguration
    .map((b) => `${b.count} ${b.type.toLowerCase().replace("_", " ")}`)
    .join(", ");

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-cream max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="eyebrow mb-1">{hotelName}</div>
              <h2 className="font-serif text-2xl">{room.name}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-ink/60 hover:text-ink text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm border-y border-ink/10 py-4 mb-4">
            {room.sizeSqm && (
              <Field label="Size">
                {room.sizeSqm} m² ({Math.round(room.sizeSqm * 10.7639)} sq ft)
              </Field>
            )}
            {beds && <Field label="Beds">{beds}</Field>}
            {room.view && <Field label="View">{room.view}</Field>}
            {room.maxOccupancy && (
              <Field label="Max occupancy">
                {room.maxOccupancy.adults} adult{room.maxOccupancy.adults === 1 ? "" : "s"}
                {room.maxOccupancy.children > 0 &&
                  `, ${room.maxOccupancy.children} child${
                    room.maxOccupancy.children === 1 ? "" : "ren"
                  }`}
              </Field>
            )}
            <Field label="Category">{room.category.replace(/_/g, " ").toLowerCase()}</Field>
          </dl>

          {room.description?.text && (
            <p className="text-sm text-ink/80 leading-relaxed">{room.description.text}</p>
          )}
        </div>

        <div className="border-t border-ink/10 px-6 md:px-8 py-4 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.15em] text-ink/55 mb-1">{label}</dt>
      <dd className="capitalize">{children}</dd>
    </div>
  );
}
