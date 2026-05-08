// Reusable search bar.
//
// Two variants:
//   • "compact" — Destination + Stay dates + Find hotel (home + brand pages).
//   • "full"    — adds the Guest picker (results page header).
//
// Stay dates use a single date-range calendar — see DateRangePicker.tsx.
// Form posts to /search?destination=&checkIn=&checkOut=&...

import { withDefaults } from "@/lib/search";
import { GuestPicker } from "./GuestPicker";
import { DateRangePicker } from "./DateRangePicker";
import { DestinationAutocomplete } from "./DestinationAutocomplete";

type Defaults = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  rooms?: number;
  adults?: number;
  children?: number;
  childAges?: number[];
};

export function SearchBar({
                            brandId,
                            brandName,
                            defaults,
                            theme = "cream",
                            variant = "full",
                          }: {
  brandId?: string;
  brandName?: string;
  defaults?: Defaults;
  theme?: "cream" | "ink";
  variant?: "compact" | "full";
}) {
  const d = withDefaults({ ...defaults, brandId });

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";
  const containerCls =
          theme === "ink"
                  ? "border border-cream/15 bg-ink/30 backdrop-blur"
                  : "bg-cream/95 backdrop-blur shadow-2xl shadow-black/20 border border-ink/10";

  // Always one row across desktop. Compact: 3 columns. Full: 4 columns.
  const gridCls =
          variant === "compact"
                  ? "grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_auto] gap-px"
                  : "grid grid-cols-1 md:grid-cols-[1.3fr_1.4fr_1.2fr_auto] gap-px";

  return (
          <form
                  action="/search"
                  method="get"
                  className={`${gridCls} ${containerCls}`}
                  aria-label={brandName ? `Find a ${brandName} hotel` : "Find a hotel"}
          >
            {brandId && <input type="hidden" name="brandId" value={brandId} />}

            <DestinationAutocomplete
                    name="destination"
                    defaultValue={d.destination}
                    placeholder="City, hotel, region…"
                    theme={theme}
            />

            <DateRangePicker
                    theme={theme}
                    defaultCheckIn={d.checkIn}
                    defaultCheckOut={d.checkOut}
            />

            {variant === "full" && (
                    <GuestPicker
                            theme={theme}
                            initial={{
                              rooms: d.rooms,
                              adults: d.adults,
                              children: d.children,
                              childAges: d.childAges,
                            }}
                    />
            )}

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
                 labelClr,
                 fieldBg,
                 children,
               }: {
  label: string;
  name: string;
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
