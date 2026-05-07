// Editable stay-and-guests bar for the rate-list page. The user can change
// dates / room+guest counts / "Use Points" and submit Update — the form
// re-renders the same /hotels/[id]/rates URL with the new params.

import { DateRangePicker } from "./DateRangePicker";
import { GuestPicker } from "./GuestPicker";

type Defaults = {
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
};

export function StayUpdateBar({
  hotelId,
  defaults,
  usePoints,
  showTaxes,
  currency,
}: {
  hotelId: string;
  defaults: Defaults;
  usePoints: boolean;
  showTaxes: boolean;
  currency: string;
}) {
  return (
    <section className="bg-cream border-b border-ink/10">
      <div className="container-x py-6">
        <form
          action={`/hotels/${hotelId}/rates`}
          method="get"
          className="grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_auto_auto] items-end gap-4"
        >
          {/* Stay dates */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">Stay Dates</div>
            <DateRangePicker
              defaultCheckIn={defaults.checkIn}
              defaultCheckOut={defaults.checkOut}
              theme="cream"
            />
          </div>

          {/* Rooms and Guests */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">Rooms and Guests</div>
            <GuestPicker
              initial={{
                rooms: defaults.rooms,
                adults: defaults.adults,
                children: defaults.children,
                childAges: defaults.childAges,
              }}
              theme="cream"
            />
          </div>

          {/* Use Points checkbox */}
          <label className="flex items-center gap-2 cursor-pointer h-12 px-4 border border-ink/15 bg-cream/95">
            <input
              type="checkbox"
              name="usePoints"
              value="1"
              defaultChecked={usePoints}
              className="w-4 h-4 accent-goldDeep"
            />
            <span className="text-sm">Use Points (Rewards)</span>
          </label>

          {/* Hidden carry-forward state */}
          <input type="hidden" name="currency" value={currency} />
          {showTaxes && <input type="hidden" name="showTaxes" value="1" />}

          <button type="submit" className="btn-primary h-12 px-8 whitespace-nowrap">
            Update
          </button>
        </form>
      </div>
    </section>
  );
}
