// Visual booking search bar — does not perform a real availability call.
// In a production build, the submit handler would route to /hotels with the
// filter query-string params already wired to HOTELS_LIST_QUERY.

import Link from "next/link";

export function SearchBar() {
  return (
          <form
                  action="/hotels"
                  className="bg-cream/95 backdrop-blur shadow-2xl shadow-black/20 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-px border border-ink/10"
          >
            <Field label="Destination" name="city">
              <input
                      type="text"
                      name="city"
                      placeholder="City, hotel, region…"
                      className="w-full bg-transparent outline-none text-sm py-1"
              />
            </Field>
            <Field label="Check in" name="checkIn">
              <input type="date" name="checkIn" className="w-full bg-transparent outline-none text-sm py-1" />
            </Field>
            <Field label="Check out" name="checkOut">
              <input type="date" name="checkOut" className="w-full bg-transparent outline-none text-sm py-1" />
            </Field>
            <Field label="Guests" name="adults">
              <select name="adults" defaultValue="2" className="w-full bg-transparent outline-none text-sm py-1">
                <option value="1">1 adult</option>
                <option value="2">2 adults</option>
                <option value="3">3 adults</option>
                <option value="4">4+ adults</option>
              </select>
            </Field>
            <button type="submit" className="btn-primary justify-center md:rounded-none md:py-0 md:h-full md:px-8">
              Find a hotel
            </button>
          </form>
  );
}

function Field({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
          <label htmlFor={name} className="px-5 py-3 bg-cream block">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1">{label}</div>
            {children}
          </label>
  );
}

export function FindHotelLink() {
  return (
          <Link href="/hotels" className="btn-primary">
            Find a hotel
          </Link>
  );
}
