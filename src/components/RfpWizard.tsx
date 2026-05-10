"use client";

// Five-step RFP wizard for /meetings/[hotelId]/[spaceId]/rfp.
//
// State is held in a single `RfpDraft` object (one useState) so the
// wizard can persist to a parent / hand off to autosave without prop-
// drilling per step. Validation runs on each "Next" click using the
// pure validators from `lib/meetings.ts`; failures keep the user on
// the current step and focus the first invalid input. Final submit
// calls `submitRfpAction` and routes to /account/events on success.
//
// The right-rail sidebar is always visible on desktop; on mobile it
// slides below the form. It mirrors the booking-flow sticky summary
// so the planner sees their evolving brief at all times.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  draftToSubmitVariables,
  EVENT_TYPES,
  formatStayWindow,
  labelEventType,
  labelRfpStep,
  labelSetup,
  nextStep,
  prevStep,
  RFP_WIZARD_STEPS,
  SETUP_STYLES,
  validateRfpStep,
  type RfpDraft,
  type RfpStepErrors,
  type RfpWizardStep,
  type SetupStyle,
} from "@/lib/meetings";
import { submitRfpAction } from "@/lib/meetingActions";

export type WizardSeed = {
  hotelId: string;
  hotelName: string;
  spaceId: string;
  spaceName: string;
  /** Initial guess from the URL — wizard owns mutation after mount. */
  initial: Partial<RfpDraft>;
  /** Pre-filled guest contact info from the session. */
  contact: {
    organizer: string;
    organization: string;
    contactEmail: string;
    contactPhone: string;
  };
};

const blankDraft: RfpDraft = {
  eventName: "",
  eventType: "CORPORATE_MEETING",
  startDate: "",
  endDate: "",
  attendees: 0,
  guestRoomsPerNight: null,
  spaceRequirements: [],
  cateringRequirements: "",
  additionalRequirements: "",
  organizer: "",
  organization: "",
  contactEmail: "",
  contactPhone: "",
};

export function RfpWizard({ seed }: { seed: WizardSeed }) {
  const router = useRouter();
  const [step, setStep] = useState<RfpWizardStep>("basics");
  const [draft, setDraft] = useState<RfpDraft>(() => ({
    ...blankDraft,
    ...seed.initial,
    organizer: seed.contact.organizer,
    organization: seed.contact.organization,
    contactEmail: seed.contact.contactEmail,
    contactPhone: seed.contact.contactPhone,
    spaceRequirements: seed.initial.spaceRequirements?.length
      ? seed.initial.spaceRequirements
      : [
          {
            name: seed.spaceName,
            setup: (seed.initial.spaceRequirements?.[0]?.setup ?? "THEATER") as SetupStyle,
            attendees: seed.initial.attendees ?? 50,
            durationHours: 8,
            startTime: "09:00",
          },
        ],
  }));
  const [errors, setErrors] = useState<RfpStepErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (patch: Partial<RfpDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function onNext() {
    const found = validateRfpStep(step, draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => {
        const k = Object.keys(found)[0];
        document.getElementById(k.replace(/\./g, "-"))?.focus();
      });
      return;
    }
    setStep((s) => nextStep(s));
  }
  function onBack() {
    setErrors({});
    setStep((s) => prevStep(s));
  }

  function onSubmit() {
    const found = validateRfpStep("review", draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Some fields need attention before we can submit.");
      return;
    }
    setErrors({});
    setFormError(null);
    const input = draftToSubmitVariables(draft, [seed.hotelId]);
    startTransition(async () => {
      const result = await submitRfpAction(input);
      if (!result.ok) {
        setFormError(result.formError);
        if (result.fieldErrors) setErrors(result.fieldErrors);
        return;
      }
      router.push(`/account/events?ref=${encodeURIComponent(result.rfpNumber)}`);
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-8">
      <div>
        <Stepper current={step} />

        <div className="border border-ink/10 bg-white p-6 md:p-8 mt-6">
          <h2 className="font-serif text-2xl mb-1">{labelRfpStep(step)}</h2>
          <p className="text-sm text-ink/55 mb-6">
            {STEP_HINT[step]}
          </p>

          {step === "basics" && (
            <BasicsStep draft={draft} errors={errors} update={update} />
          )}
          {step === "spaces" && (
            <SpacesStep draft={draft} errors={errors} update={update} />
          )}
          {step === "catering" && (
            <CateringStep draft={draft} errors={errors} update={update} />
          )}
          {step === "contact" && (
            <ContactStep draft={draft} errors={errors} update={update} />
          )}
          {step === "review" && (
            <ReviewStep draft={draft} hotelName={seed.hotelName} />
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2"
          >
            {formError}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === "basics" || pending}
            className="text-sm underline hover:no-underline text-ink/65 disabled:opacity-30 disabled:no-underline"
          >
            ← Back
          </button>
          {step !== "review" ? (
            <button
              type="button"
              onClick={onNext}
              className="btn-primary px-6 py-3"
              disabled={pending}
            >
              Next: {labelRfpStep(nextStep(step))}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              className="btn-primary px-6 py-3 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit RFP"}
            </button>
          )}
        </div>
      </div>

      <SummarySidebar draft={draft} seed={seed} />
    </div>
  );
}

const STEP_HINT: Record<RfpWizardStep, string> = {
  basics: "Tell us when, what kind of event, and how many people.",
  spaces: "Describe the spaces you'll need — plenary plus any breakouts.",
  catering: "Anything we should know about food, beverage, or extras.",
  contact: "Where the planner should send their proposal.",
  review: "Final once-over before we route this to the planning team.",
};

// ── Stepper rail ─────────────────────────────────────────────────────────

function Stepper({ current }: { current: RfpWizardStep }) {
  const idx = RFP_WIZARD_STEPS.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {RFP_WIZARD_STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px]",
                done && "bg-emerald-700 text-cream",
                active && "bg-ink text-cream",
                !done && !active && "bg-ink/10 text-ink/55",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={[
                "uppercase tracking-[0.18em]",
                active ? "text-ink" : "text-ink/55",
              ].join(" ")}
            >
              {labelRfpStep(s)}
            </span>
            {i < RFP_WIZARD_STEPS.length - 1 && (
              <span aria-hidden className="text-ink/25 mx-1">
                /
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────

type StepProps = {
  draft: RfpDraft;
  errors: RfpStepErrors;
  update: (patch: Partial<RfpDraft>) => void;
};

function BasicsStep({ draft, errors, update }: StepProps) {
  return (
    <Grid>
      <Field id="eventName" label="Event name" error={errors.eventName} className="md:col-span-2">
        <input
          id="eventName"
          value={draft.eventName}
          onChange={(e) => update({ eventName: e.target.value })}
          className={inputCls(errors.eventName)}
        />
      </Field>
      <Field id="eventType" label="Event type" error={errors.eventType}>
        <select
          id="eventType"
          value={draft.eventType}
          onChange={(e) =>
            update({ eventType: e.target.value as RfpDraft["eventType"] })
          }
          className={inputCls(errors.eventType)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {labelEventType(t)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="attendees" label="Attendees" error={errors.attendees}>
        <input
          id="attendees"
          type="number"
          min={2}
          max={5000}
          inputMode="numeric"
          value={draft.attendees || ""}
          onChange={(e) => update({ attendees: Number(e.target.value) || 0 })}
          className={inputCls(errors.attendees)}
        />
      </Field>
      <Field id="startDate" label="Start" error={errors.startDate}>
        <input
          id="startDate"
          type="date"
          value={draft.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
          className={inputCls(errors.startDate)}
        />
      </Field>
      <Field id="endDate" label="End" error={errors.endDate}>
        <input
          id="endDate"
          type="date"
          value={draft.endDate}
          min={draft.startDate || undefined}
          onChange={(e) => update({ endDate: e.target.value })}
          className={inputCls(errors.endDate)}
        />
      </Field>
      <Field
        id="guestRoomsPerNight"
        label="Guest rooms per night"
        optional
        error={errors.guestRoomsPerNight}
        className="md:col-span-2"
      >
        <input
          id="guestRoomsPerNight"
          type="number"
          min={0}
          max={5000}
          inputMode="numeric"
          value={draft.guestRoomsPerNight ?? ""}
          onChange={(e) =>
            update({
              guestRoomsPerNight: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className={inputCls(errors.guestRoomsPerNight)}
          placeholder="Leave blank if you don't need a room block"
        />
      </Field>
    </Grid>
  );
}

function SpacesStep({ draft, errors, update }: StepProps) {
  const setRow = (i: number, patch: Partial<RfpDraft["spaceRequirements"][number]>) => {
    const next = draft.spaceRequirements.map((sr, idx) =>
      idx === i ? { ...sr, ...patch } : sr,
    );
    update({ spaceRequirements: next });
  };
  const addRow = () =>
    update({
      spaceRequirements: [
        ...draft.spaceRequirements,
        {
          name: "",
          setup: "BOARDROOM",
          attendees: Math.min(draft.attendees, 50) || 20,
          durationHours: 4,
          startTime: "13:00",
        },
      ],
    });
  const removeRow = (i: number) =>
    update({
      spaceRequirements: draft.spaceRequirements.filter((_, idx) => idx !== i),
    });

  return (
    <div className="space-y-4">
      {errors.spaceRequirements && (
        <p className="text-sm text-red-600">{errors.spaceRequirements}</p>
      )}
      {draft.spaceRequirements.map((row, i) => (
        <fieldset key={i} className="border border-ink/10 p-4">
          <legend className="px-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
            Space {i + 1}
          </legend>
          <Grid>
            <Field
              id={`space-${i}-name`}
              label="Name"
              error={errors[`space.${i}.name`]}
              className="md:col-span-2"
            >
              <input
                id={`space-${i}-name`}
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                className={inputCls(errors[`space.${i}.name`])}
                placeholder="Plenary, breakout, dinner reception…"
              />
            </Field>
            <Field
              id={`space-${i}-setup`}
              label="Setup"
              error={errors[`space.${i}.setup`]}
            >
              <select
                id={`space-${i}-setup`}
                value={row.setup}
                onChange={(e) => setRow(i, { setup: e.target.value as SetupStyle })}
                className={inputCls(errors[`space.${i}.setup`])}
              >
                {SETUP_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {labelSetup(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id={`space-${i}-attendees`}
              label="Attendees"
              error={errors[`space.${i}.attendees`]}
            >
              <input
                id={`space-${i}-attendees`}
                type="number"
                min={1}
                max={5000}
                value={row.attendees || ""}
                onChange={(e) =>
                  setRow(i, { attendees: Number(e.target.value) || 0 })
                }
                className={inputCls(errors[`space.${i}.attendees`])}
              />
            </Field>
            <Field
              id={`space-${i}-durationHours`}
              label="Duration (hours)"
              error={errors[`space.${i}.durationHours`]}
            >
              <input
                id={`space-${i}-durationHours`}
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={row.durationHours || ""}
                onChange={(e) =>
                  setRow(i, { durationHours: Number(e.target.value) || 0 })
                }
                className={inputCls(errors[`space.${i}.durationHours`])}
              />
            </Field>
            <Field
              id={`space-${i}-startTime`}
              label="Start time"
              optional
              error={errors[`space.${i}.startTime`]}
            >
              <input
                id={`space-${i}-startTime`}
                type="time"
                value={row.startTime ?? ""}
                onChange={(e) =>
                  setRow(i, { startTime: e.target.value || null })
                }
                className={inputCls(errors[`space.${i}.startTime`])}
              />
            </Field>
          </Grid>
          {draft.spaceRequirements.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="mt-3 text-xs text-red-600 underline hover:no-underline"
            >
              Remove this space
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-goldDeep underline hover:no-underline"
      >
        + Add another space
      </button>
    </div>
  );
}

function CateringStep({ draft, errors, update }: StepProps) {
  return (
    <div className="space-y-5">
      <Field
        id="cateringRequirements"
        label="Catering requirements"
        optional
        error={errors.cateringRequirements}
      >
        <textarea
          id="cateringRequirements"
          rows={4}
          maxLength={2000}
          value={draft.cateringRequirements}
          onChange={(e) => update({ cateringRequirements: e.target.value })}
          className={inputCls(errors.cateringRequirements)}
          placeholder="Plated lunch + canapé reception, dietary notes, beverage program…"
        />
      </Field>
      <Field
        id="additionalRequirements"
        label="Additional requirements"
        optional
        error={errors.additionalRequirements}
      >
        <textarea
          id="additionalRequirements"
          rows={4}
          maxLength={2000}
          value={draft.additionalRequirements}
          onChange={(e) => update({ additionalRequirements: e.target.value })}
          className={inputCls(errors.additionalRequirements)}
          placeholder="A/V add-ons, transport, branded signage, accessibility, language support…"
        />
      </Field>
    </div>
  );
}

function ContactStep({ draft, errors, update }: StepProps) {
  return (
    <Grid>
      <Field id="organizer" label="Your name" error={errors.organizer}>
        <input
          id="organizer"
          autoComplete="name"
          value={draft.organizer}
          onChange={(e) => update({ organizer: e.target.value })}
          className={inputCls(errors.organizer)}
        />
      </Field>
      <Field id="organization" label="Organization" error={errors.organization}>
        <input
          id="organization"
          autoComplete="organization"
          value={draft.organization}
          onChange={(e) => update({ organization: e.target.value })}
          className={inputCls(errors.organization)}
        />
      </Field>
      <Field id="contactEmail" label="Email" error={errors.contactEmail}>
        <input
          id="contactEmail"
          type="email"
          autoComplete="email"
          value={draft.contactEmail}
          onChange={(e) => update({ contactEmail: e.target.value })}
          className={inputCls(errors.contactEmail)}
        />
      </Field>
      <Field id="contactPhone" label="Phone" error={errors.contactPhone}>
        <input
          id="contactPhone"
          autoComplete="tel"
          value={draft.contactPhone}
          onChange={(e) => update({ contactPhone: e.target.value })}
          className={inputCls(errors.contactPhone)}
        />
      </Field>
    </Grid>
  );
}

function ReviewStep({
  draft,
  hotelName,
}: {
  draft: RfpDraft;
  hotelName: string;
}) {
  const window = useMemo(
    () => formatStayWindow(draft.startDate, draft.endDate),
    [draft.startDate, draft.endDate],
  );
  return (
    <dl className="text-sm space-y-3">
      <Row label="Event">
        <strong>{draft.eventName}</strong> — {labelEventType(draft.eventType)}
      </Row>
      <Row label="Hotel">{hotelName}</Row>
      <Row label="Window">{window}</Row>
      <Row label="Attendees">
        {draft.attendees}
        {draft.guestRoomsPerNight
          ? ` · ${draft.guestRoomsPerNight} guest rooms / night`
          : ""}
      </Row>
      <Row label="Spaces">
        <ul className="space-y-1">
          {draft.spaceRequirements.map((sr, i) => (
            <li key={i}>
              <strong>{sr.name}</strong> — {labelSetup(sr.setup)} · {sr.attendees} ppl ·{" "}
              {sr.durationHours}h{sr.startTime ? ` from ${sr.startTime}` : ""}
            </li>
          ))}
        </ul>
      </Row>
      {draft.cateringRequirements && (
        <Row label="Catering">{draft.cateringRequirements}</Row>
      )}
      {draft.additionalRequirements && (
        <Row label="Additional">{draft.additionalRequirements}</Row>
      )}
      <Row label="Contact">
        {draft.organizer} · {draft.organization} · {draft.contactEmail} · {draft.contactPhone}
      </Row>
    </dl>
  );
}

// ── Sidebar (sticky on desktop) ─────────────────────────────────────────

function SummarySidebar({
  draft,
  seed,
}: {
  draft: RfpDraft;
  seed: WizardSeed;
}) {
  return (
    <aside className="md:sticky md:top-6 self-start border border-ink/10 bg-white p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        Your RFP
      </div>
      <h3 className="font-serif text-xl mb-1">{draft.eventName || "Untitled event"}</h3>
      <p className="text-sm text-ink/65 mb-4">
        {seed.spaceName} · {seed.hotelName}
      </p>
      <dl className="text-xs space-y-2 border-t border-ink/10 pt-3">
        <SidebarRow label="Type">{labelEventType(draft.eventType)}</SidebarRow>
        <SidebarRow label="Window">
          {draft.startDate && draft.endDate
            ? formatStayWindow(draft.startDate, draft.endDate)
            : "—"}
        </SidebarRow>
        <SidebarRow label="Attendees">{draft.attendees || "—"}</SidebarRow>
        <SidebarRow label="Spaces">{draft.spaceRequirements.length}</SidebarRow>
      </dl>
      <p className="mt-4 text-[11px] text-ink/55">
        A planner will respond within one business day. You&rsquo;ll be able to
        track replies and accept a proposal in your account.
      </p>
    </aside>
  );
}

// ── Layout primitives ────────────────────────────────────────────────────

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  id,
  label,
  optional,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className={`block ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
        {optional && <span className="lowercase tracking-normal text-ink/45">(optional)</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function inputCls(error?: string): string {
  return [
    "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
    error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
  ].join(" ");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink/55 pt-0.5">
        {label}
      </dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-ink/55 uppercase tracking-[0.18em]">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
