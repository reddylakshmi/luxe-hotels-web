"use client";

// Cancel-RFP dialog. Hides behind a button on the RFP card; opens a
// modal with a reason textarea and confirms before posting to
// cancelRfpAction. Mirrors the cancel-reservation flow on /trips/[id].

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  cancelRfpAction,
  type CancelRfpState,
} from "@/lib/meetingActions";

const initial: CancelRfpState = { ok: false };

export function RfpCancelDialog({
  rfpId,
  eventName,
}: {
  rfpId: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(cancelRfpAction, initial);

  if (state.ok) {
    return (
      <p className="text-xs text-emerald-700">
        Cancelled. Refresh to see updated status.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-red-700 underline hover:no-underline"
      >
        Cancel RFP
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cancel-rfp-${rfpId}-title`}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 px-4"
        >
          <div className="bg-cream max-w-md w-full p-6 border border-ink/15">
            <h2
              id={`cancel-rfp-${rfpId}-title`}
              className="font-serif text-2xl mb-2"
            >
              Cancel this RFP?
            </h2>
            <p className="text-sm text-ink/70 mb-4">
              Cancelling withdraws the request for{" "}
              <strong className="text-ink">{eventName}</strong>. Hotels will
              be notified that you&rsquo;re no longer evaluating proposals.
            </p>
            <form action={action} className="space-y-3">
              <input type="hidden" name="rfpId" value={rfpId} />
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
                  Reason (optional)
                </span>
                <textarea
                  name="reason"
                  rows={3}
                  maxLength={500}
                  placeholder="Plans changed, picked another venue, …"
                  className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-goldDeep"
                />
              </label>
              {state.formError && (
                <p className="text-xs text-red-600">{state.formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm px-3 py-2 text-ink/65 hover:text-ink"
                >
                  Keep RFP
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm px-4 py-2 bg-red-700 text-cream hover:bg-red-800 disabled:opacity-50"
    >
      {pending ? "Cancelling…" : "Cancel RFP"}
    </button>
  );
}
