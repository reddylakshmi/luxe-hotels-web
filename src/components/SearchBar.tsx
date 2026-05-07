// Reusable search bar. Posts to /search?destination=&checkIn=&checkOut=&adults=&brandId=
// When `brandId` is provided, the search is scoped to that brand and a
// hidden input carries the id forward.

import { withDefaults } from "@/lib/search";

export function SearchBar({
                            brandId,
                            brandName,
                            defaults,
                            theme = "cream",
                          }: {
  brandId?: string;
  brandName?: string;
  defaults?: { destination?: string; checkIn?: string; checkOut?: string; adults?: number };
  theme?: "cream" | "ink";
}) {
  const d = withDefaults({
    destination: defaults?.destination,
    checkIn: defaults?.checkIn,
    checkOut: defaults?.checkOut,
    adults: defaults?.adults,
    brandId,
  });

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";
  const containerCls =
          theme === "ink"
                  ? "border border-cream/15 bg-ink/30 backdrop-blur"
                  : "bg-cream/95 backdrop-blur shadow-2xl shadow-black/20 border border-ink/10";

  return (
          <form
                  action="/search"
                  method="get"
                  className={`grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-px ${containerCls}`}
                  aria-label={brandName ? `Find a ${brandName} hotel` : "Find a hotel"}
          >
            {brandId && <input type="hidden" name="brandId" value={brandId} />}
            <Field label={brandName ? `Destination · ${brandName}` : "Destination"} name="destination"
                   theme={theme} labelClr={labelClr} fieldBg={fieldBg}>
              <input
                      type="text"
                      name="destination"
                      defaultValue={d.destination}
                      placeholder="City, hotel, region…"
                      className={`w-full bg-transparent outline-none text-sm py-1 placeholder:opacity-50`}
                      autoComplete="off"
              />
            </Field>
            <Field label="Check in" name="checkIn" theme={theme} labelClr={labelClr} fieldBg={fieldBg}>
              <input
                      type="date"
                      name="checkIn"
                      defaultValue={d.checkIn}
                      min={isoToday()}
                      className="w-full bg-transparent outline-none text-sm py-1"
                      required
              />
            </Field>
            <Field label="Check out" name="checkOut" theme={theme} labelClr={labelClr} fieldBg={fieldBg}>
              <input
                      type="date"
                      name="checkOut"
                      defaultValue={d.checkOut}
                      min={d.checkIn}
                      className="w-full bg-transparent outline-none text-sm py-1"
                      required
              />
            </Field>
            <Field label="Guests" name="adults" theme={theme} labelClr={labelClr} fieldBg={fieldBg}>
              <select
                      name="adults"
                      defaultValue={String(d.adults)}
                      className="w-full bg-transparent outline-none text-sm py-1"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={String(n)}>
                          {n} adult{n === 1 ? "" : "s"}
                        </option>
                ))}
              </select>
            </Field>
            <button
                    type="submit"
                    className="btn-primary justify-center md:rounded-none md:py-0 md:h-full md:px-8"
                    aria-label="Search"
            >
              Find a hotel
            </button>
          </form>
  );
}

function Field({
                 label,
                 name,
                 theme,
                 labelClr,
                 fieldBg,
                 children,
               }: {
  label: string;
  name: string;
  theme: "cream" | "ink";
  labelClr: string;
  fieldBg: string;
  children: React.ReactNode;
}) {
  return (
          <label htmlFor={name} className={`px-5 py-3 block ${fieldBg}`}>
            <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>{label}</div>
            {children}
          </label>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
