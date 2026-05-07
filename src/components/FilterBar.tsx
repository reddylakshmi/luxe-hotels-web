"use client";

// Horizontal filter bar that lives directly under the search section.
// Each filter is a pill button that opens a portaled <Popover> with the
// inline form. Submitting any pill submits the whole form so the URL
// remains the single source of truth — refreshing the page or sharing
// the link reproduces the result set.
//
// Patterned after the filter strip on marriott.com / booking.com.

import { useRef, useState } from "react";
import { Popover } from "./Popover";
import type { Brand, HotelFacets } from "@/types/graphql";

export type FilterState = {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  brandId?: string;
  brandIds?: string[];
  brandTiers?: string[];
  minStarRating?: number;
  minGuestRating?: number;
  hasPool?: boolean;
  hasSpa?: boolean;
  hasGolf?: boolean;
  hasFreeBreakfast?: boolean;
  petsAllowed?: boolean;
  minNightlyRate?: number;
  maxNightlyRate?: number;
};

const GUEST_RATING_OPTIONS = [
  { label: "9+ Exceptional", value: 9 },
  { label: "8+ Excellent", value: 8 },
  { label: "7+ Very good", value: 7 },
];
const TIERS = [
  { code: "LUXURY", label: "Luxury" },
  { code: "PREMIUM", label: "Premium" },
  { code: "SELECT", label: "Select" },
];
const PRICE_PRESETS = [
  { label: "Under $200",  min: undefined, max: 200 },
  { label: "$200 – $400", min: 200, max: 400 },
  { label: "$400 – $700", min: 400, max: 700 },
  { label: "$700+",       min: 700, max: undefined },
];
const AMENITIES: { name: keyof FilterState; label: string; hint?: string }[] = [
  { name: "hasFreeBreakfast", label: "Free breakfast" },
  { name: "hasPool",          label: "Pool" },
  { name: "hasSpa",           label: "Spa" },
  { name: "hasGolf",          label: "Golf course" },
  { name: "petsAllowed",      label: "Pet-friendly" },
];

export function FilterBar({
                            active,
                            brands,
                            facets,
                          }: {
  active: FilterState;
  brands: Brand[];
  facets?: HotelFacets;
}) {
  const activeCount = countActiveFilters(active);

  // Index facets for O(1) lookup by id/key.
  const brandCount = new Map(facets?.byBrand.map((b) => [b.brandId, b.count]) ?? []);
  const tierCount = new Map(facets?.byBrandTier.map((t) => [t.tier, t.count]) ?? []);
  const grCount = new Map(facets?.guestRating.map((g) => [g.minRating, g.count]) ?? []);

  return (
          <div className="border-b border-ink/10 bg-cream sticky top-16 z-30">
            <div className="container-x py-4 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mr-2">Filters</span>

              <PriceFilter active={active} />
              <GuestRatingFilter active={active} grCount={grCount} />
              <TierFilter active={active} tierCount={tierCount} />
              <BrandFilter active={active} brands={brands} brandCount={brandCount} />
              <AmenitiesFilter active={active} amenityCount={facets?.amenities} />

              <span className="ml-auto flex items-center gap-3 text-xs">
            {activeCount > 0 && (
                    <a href={resetUrl(active)} className="text-ink/60 underline hover:text-ink">
                      Clear all ({activeCount})
                    </a>
            )}
          </span>
            </div>
          </div>
  );
}

// ── Filter pills ────────────────────────────────────────────────────────────

function PriceFilter({ active }: { active: FilterState }) {
  const summary = priceLabel(active.minNightlyRate, active.maxNightlyRate);
  return (
          <Pill label="Price" value={summary} widthPx={320} active={!!summary}>
            {(close) => (
                    <FilterForm active={active} close={close} excluding={["minNightlyRate", "maxNightlyRate"]}>
                      <SectionHeading>Price (USD per night)</SectionHeading>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <NumberInput name="minNightlyRate" label="Min" defaultValue={active.minNightlyRate} placeholder="0" />
                        <NumberInput name="maxNightlyRate" label="Max" defaultValue={active.maxNightlyRate} placeholder="2000" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRICE_PRESETS.map((p) => {
                          const isActive = active.minNightlyRate === p.min && active.maxNightlyRate === p.max;
                          return (
                                  <button
                                          key={p.label}
                                          // type="button" + manual submit avoids both the
                                          // URL-pollution from a named submit button and the
                                          // race between value-set and default form submission.
                                          type="button"
                                          onClick={(e) => {
                                            const form = (e.currentTarget as HTMLButtonElement).form!;
                                            (form.elements.namedItem("minNightlyRate") as HTMLInputElement).value = p.min == null ? "" : String(p.min);
                                            (form.elements.namedItem("maxNightlyRate") as HTMLInputElement).value = p.max == null ? "" : String(p.max);
                                            form.submit();
                                          }}
                                          className={`text-xs px-3 py-2 border ${
                                                  isActive
                                                          ? "border-ink bg-ink text-cream"
                                                          : "border-ink/20 hover:border-ink"
                                          }`}
                                  >
                                    {p.label}
                                  </button>
                          );
                        })}
                      </div>
                    </FilterForm>
            )}
          </Pill>
  );
}

function GuestRatingFilter({
                             active,
                             grCount,
                           }: {
  active: FilterState;
  grCount: Map<number, number>;
}) {
  const opt = GUEST_RATING_OPTIONS.find((o) => o.value === active.minGuestRating);
  return (
          <Pill label="Guest rating" value={opt?.label} widthPx={280}
                active={!!active.minGuestRating}>
            {(close) => (
                    <FilterForm active={active} close={close} excluding={["minGuestRating"]}>
                      <SectionHeading>Guest rating</SectionHeading>
                      <div className="space-y-1.5">
                        {GUEST_RATING_OPTIONS.map((o) => {
                          const c = grCount.get(o.value);
                          return (
                                  <Radio
                                          key={o.value}
                                          name="minGuestRating"
                                          value={String(o.value)}
                                          defaultChecked={active.minGuestRating === o.value}
                                          label={o.label}
                                          count={c}
                                  />
                          );
                        })}
                        <Radio name="minGuestRating" value=""
                               defaultChecked={!active.minGuestRating}
                               label="Any rating" muted />
                      </div>
                    </FilterForm>
            )}
          </Pill>
  );
}

function TierFilter({
                      active,
                      tierCount,
                    }: {
  active: FilterState;
  tierCount: Map<string, number>;
}) {
  const sel = active.brandTiers ?? [];
  const value = sel.length === 1 ? TIERS.find((t) => t.code === sel[0])?.label
          : sel.length > 1 ? `${sel.length} selected` : undefined;
  return (
          <Pill label="Brand tier" value={value} widthPx={260} active={sel.length > 0}>
            {(close) => (
                    <FilterForm active={active} close={close} excluding={["brandTiers"]}>
                      <SectionHeading>Brand tier</SectionHeading>
                      <div className="space-y-1.5">
                        {TIERS.map((t) => (
                                <Checkbox key={t.code} name="brandTiers" value={t.code}
                                          defaultChecked={sel.includes(t.code)} label={t.label}
                                          count={tierCount.get(t.code)} />
                        ))}
                      </div>
                    </FilterForm>
            )}
          </Pill>
  );
}

function BrandFilter({
                       active,
                       brands,
                       brandCount,
                     }: {
  active: FilterState;
  brands: Brand[];
  brandCount: Map<string, number>;
}) {
  const sel = active.brandIds ?? [];
  const value = sel.length === 1 ? brands.find((b) => b.id === sel[0])?.name
          : sel.length > 1 ? `${sel.length} selected` : undefined;

  // Group brands by tier so Luxury / Premium / Select are scannable at a
  // glance. Within each tier, sort alphabetically.
  const TIER_ORDER = ["LUXURY", "PREMIUM", "SELECT"];
  const grouped: Record<string, Brand[]> = {};
  for (const b of brands) {
    const t = b.tier ?? "OTHER";
    (grouped[t] ??= []).push(b);
  }
  for (const t of Object.keys(grouped)) {
    grouped[t].sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
          <Pill label="Brands" value={value} widthPx={360} active={sel.length > 0}>
            {(close) => (
                    <FilterForm active={active} close={close} excluding={["brandIds"]}>
                      <SectionHeading>Brands</SectionHeading>
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {TIER_ORDER.filter((t) => grouped[t]?.length).map((tier) => (
                                <div key={tier}>
                                  <div className="text-[10px] uppercase tracking-[0.2em] text-ink/45 mb-1.5">
                                    {tier.charAt(0) + tier.slice(1).toLowerCase()}
                                  </div>
                                  <div className="space-y-1">
                                    {grouped[tier].map((b) => {
                                      const c = brandCount.get(b.id);
                                      return (
                                              <Checkbox
                                                      key={b.id}
                                                      name="brandIds"
                                                      value={b.id}
                                                      defaultChecked={sel.includes(b.id)}
                                                      label={b.name}
                                                      count={c}
                                              />
                                      );
                                    })}
                                  </div>
                                </div>
                        ))}
                      </div>
                    </FilterForm>
            )}
          </Pill>
  );
}

function AmenitiesFilter({
                           active,
                           amenityCount,
                         }: {
  active: FilterState;
  amenityCount?: HotelFacets["amenities"];
}) {
  const count = AMENITIES.filter((a) => active[a.name]).length;
  const value = count > 0 ? `${count} selected` : undefined;
  return (
          <Pill label="Amenities" value={value} widthPx={300} active={count > 0}>
            {(close) => (
                    <FilterForm
                            active={active}
                            close={close}
                            excluding={AMENITIES.map((a) => a.name as string)}
                    >
                      <SectionHeading>Amenities</SectionHeading>
                      <div className="space-y-1.5">
                        {AMENITIES.map((a) => (
                                <Checkbox
                                        key={a.name as string}
                                        name={a.name as string}
                                        value="true"
                                        defaultChecked={!!active[a.name]}
                                        label={a.label}
                                        count={amenityCount?.[a.name as keyof HotelFacets["amenities"]]}
                                />
                        ))}
                      </div>
                    </FilterForm>
            )}
          </Pill>
  );
}

// ── Pill primitive ───────────────────────────────────────────────────────────

function Pill({
                label,
                value,
                active,
                widthPx,
                children,
              }: {
  label: string;
  value?: string;
  active: boolean;
  widthPx: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
          <>
            <button
                    ref={ref}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    className={`text-xs uppercase tracking-[0.18em] px-4 py-2 border whitespace-nowrap transition-colors ${
                            active
                                    ? "bg-ink text-cream border-ink"
                                    : "border-ink/20 text-ink/80 hover:border-ink hover:text-ink"
                    }`}
            >
              {value ? <span className="normal-case font-medium tracking-normal">{label}: {value}</span>
                      : label}
            </button>
            <Popover anchorRef={ref} open={open} onClose={close} align="start" widthPx={widthPx}>
              {children(close)}
            </Popover>
          </>
  );
}

// ── Form helpers ─────────────────────────────────────────────────────────────

function FilterForm({
                      active,
                      close,
                      excluding,
                      children,
                    }: {
  active: FilterState;
  close: () => void;
  /**
   * Names of the fields THIS pill is editing. They must be omitted from the
   * carry-forward so the pill's own visible inputs (radios/checkboxes/
   * number-inputs) become the authoritative submitted values for those keys.
   */
  excluding: string[];
  children: React.ReactNode;
}) {
  // We deliberately do NOT call close() in onSubmit — submitting the form
  // already triggers a full page navigation that re-renders /search with the
  // new query string and the popover state naturally resets to closed on the
  // new page. Calling close() here can race with the browser's navigation in
  // some environments and cause the form data to be lost.
  return (
          <form action="/search" method="get" className="p-5">
            {/* Carry forward EVERY active search + filter value so applying one pill
                doesn't drop any other applied filter. The pill itself overrides
                the listed `excluding` keys via its own visible inputs. */}
            <CarryAllFilters active={active} excluding={excluding} />
            {children}
            {/* Primary CTA — full width, solid ink, unmissable. We deliberately
                don't auto-submit on every checkbox change because users
                typically want to toggle several boxes before re-running the
                search. The Apply button is the explicit handoff. */}
            <button
                    type="submit"
                    className="mt-5 w-full bg-ink text-cream text-xs uppercase tracking-[0.2em] px-4 py-3.5 font-medium hover:bg-goldDeep transition-colors"
            >
              Apply filter
            </button>
            <button
                    type="button"
                    onClick={close}
                    className="mt-2 w-full text-[11px] uppercase tracking-[0.2em] px-3 py-2 text-ink/55 hover:text-ink"
            >
              Cancel
            </button>
          </form>
  );
}

/**
 * Pure function: compute the list of hidden form inputs needed to preserve
 * URL state when a single filter pill submits. Fields in `excluding` are
 * omitted (the pill body owns those keys). Exported so unit tests can pin
 * the carry-forward behaviour without spinning up React.
 */
export function buildHiddenFilterInputs(
        active: FilterState,
        excluding: string[] = [],
): { name: string; value: string }[] {
  const skip = new Set(excluding);
  const out: { name: string; value: string }[] = [];

  const single = (name: string, value: string | number | undefined) => {
    if (skip.has(name) || value === undefined || value === "") return;
    out.push({ name, value: String(value) });
  };
  const csv = (name: string, values: string[] | undefined) => {
    if (skip.has(name) || !values || values.length === 0) return;
    out.push({ name, value: values.join(",") });
  };
  const flag = (name: string, value: boolean | undefined) => {
    if (skip.has(name) || !value) return;
    out.push({ name, value: "true" });
  };

  // Search-bar context (destination, dates, guests, optional brand-scope).
  single("destination", active.destination);
  single("checkIn", active.checkIn);
  single("checkOut", active.checkOut);
  single("rooms", active.rooms);
  single("adults", active.adults);
  if (active.children > 0) {
    single("children", active.children);
    single("childAges", active.childAges.join(","));
  }
  if (active.brandId) single("brandId", active.brandId);

  // All filter pill values.
  single("minStarRating", active.minStarRating);
  single("minGuestRating", active.minGuestRating);
  csv("brandTiers", active.brandTiers);
  csv("brandIds", active.brandIds);
  single("minNightlyRate", active.minNightlyRate);
  single("maxNightlyRate", active.maxNightlyRate);
  flag("hasPool", active.hasPool);
  flag("hasSpa", active.hasSpa);
  flag("hasGolf", active.hasGolf);
  flag("hasFreeBreakfast", active.hasFreeBreakfast);
  flag("petsAllowed", active.petsAllowed);

  return out;
}

/**
 * Emit hidden inputs for every active filter field so that submitting a pill
 * preserves the rest of the URL state. Fields named in `excluding` are
 * omitted — the pill body is expected to carry those itself.
 */
function CarryAllFilters({
                           active,
                           excluding = [],
                         }: {
  active: FilterState;
  excluding?: string[];
}) {
  const inputs = buildHiddenFilterInputs(active, excluding);
  return (
          <>
            {inputs.map((input) => (
                    <input key={`cf-${input.name}`} type="hidden" name={input.name} value={input.value} />
            ))}
          </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-3">{children}</div>;
}

function Radio({
                 name, value, defaultChecked, label, muted = false, count,
               }: {
  name: string;
  value: string;
  defaultChecked: boolean;
  label: string;
  muted?: boolean;
  /** Optional facet count rendered to the right. */
  count?: number;
}) {
  const empty = count === 0;
  return (
          <label
                  className={`flex items-center justify-between gap-2 text-sm py-0.5 cursor-pointer hover:text-goldDeep ${
                          muted ? "text-ink/65" : ""
                  }`}
          >
        <span className="flex items-center gap-2.5">
          <input
                  type="radio"
                  name={name}
                  value={value}
                  defaultChecked={defaultChecked}
                  className="accent-ink"
          />
          <span>{label}</span>
        </span>
            {count != null && (
                    <span className={`text-xs tabular-nums ${empty ? "text-ink/30" : "text-ink/45"}`}>
                {count}
              </span>
            )}
          </label>
  );
}

function Checkbox({
                    name, value, defaultChecked, label, hint, count,
                  }: {
  name: string;
  value: string;
  defaultChecked: boolean;
  label: string;
  hint?: string;
  /** Optional facet count. Shown to the right; 0 disables the option. */
  count?: number;
}) {
  const empty = count === 0;
  return (
          <label className="flex items-center justify-between gap-2 text-sm py-0.5 cursor-pointer hover:text-goldDeep">
        <span className="flex items-center gap-2.5">
          <input
                  type="checkbox"
                  name={name}
                  value={value}
                  defaultChecked={defaultChecked}
                  className="accent-ink"
          />
          <span>{label}</span>
        </span>
            <span className={`text-xs tabular-nums whitespace-nowrap ${empty ? "text-ink/30" : "text-ink/45"}`}>
          {count != null ? count : hint ?? ""}
        </span>
          </label>
  );
}

function NumberInput({ name, label, defaultValue, placeholder }: {
  name: string; label: string; defaultValue?: number; placeholder?: string;
}) {
  return (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55">{label}</span>
            <input type="number" name={name} inputMode="numeric" min={0}
                   defaultValue={defaultValue ?? ""}
                   placeholder={placeholder}
                   className="bg-cream border border-ink/20 px-3 py-2 text-sm focus:border-ink outline-none" />
          </label>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function priceLabel(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined;
  if (min != null && max != null) return `$${min}–$${max}`;
  if (min != null) return `$${min}+`;
  return `Up to $${max}`;
}

function countActiveFilters(a: FilterState): number {
  let n = 0;
  if (a.minStarRating) n++;
  if (a.minGuestRating) n++;
  if (a.brandTiers?.length) n++;
  if (a.brandIds?.length) n++;
  if (a.minNightlyRate != null || a.maxNightlyRate != null) n++;
  for (const am of AMENITIES) if (a[am.name]) n++;
  return n;
}

function resetUrl(active: FilterState): string {
  const sp = new URLSearchParams();
  if (active.destination) sp.set("destination", active.destination);
  sp.set("checkIn", active.checkIn);
  sp.set("checkOut", active.checkOut);
  sp.set("rooms", String(active.rooms));
  sp.set("adults", String(active.adults));
  if (active.children > 0) {
    sp.set("children", String(active.children));
    sp.set("childAges", active.childAges.join(","));
  }
  if (active.brandId) sp.set("brandId", active.brandId);
  return `/search?${sp.toString()}`;
}
