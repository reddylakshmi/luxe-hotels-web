// Countries the platform serves — derived from the property subgraph's
// CountrySeed list (53 countries). Used by the booking form's Country
// dropdown. Order roughly by region so the dropdown groups by continent.
//
// Each entry carries an ISO 3166-1 alpha-2 code, display name, calling
// (phone) prefix, currency, and a regex hint for postal-code validation.
// The phone code is rendered inline next to the mobile field; the zip
// regex feeds the booking validator (loose enough to accept common
// real-world formats but strict enough to catch typos).

export type Country = {
  code: string;       // ISO 3166-1 alpha-2
  name: string;
  phoneCode: string;
  currency: string;
  zipRegex: RegExp;
};

export const COUNTRIES: Country[] = [
  // ── North America ─────────────────────────────────────────────────────
  { code: "US", name: "United States",      phoneCode: "+1",   currency: "USD", zipRegex: /^\d{5}(-\d{4})?$/ },
  { code: "CA", name: "Canada",             phoneCode: "+1",   currency: "CAD", zipRegex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/ },
  { code: "MX", name: "Mexico",             phoneCode: "+52",  currency: "MXN", zipRegex: /^\d{5}$/ },

  // ── South America ─────────────────────────────────────────────────────
  { code: "BR", name: "Brazil",             phoneCode: "+55",  currency: "BRL", zipRegex: /^\d{5}-?\d{3}$/ },
  { code: "AR", name: "Argentina",          phoneCode: "+54",  currency: "ARS", zipRegex: /^[A-Z]?\d{4}[A-Z]{0,3}$/ },
  { code: "CL", name: "Chile",              phoneCode: "+56",  currency: "CLP", zipRegex: /^\d{7}$/ },
  { code: "PE", name: "Peru",               phoneCode: "+51",  currency: "PEN", zipRegex: /^\d{5}$/ },

  // ── Western Europe ────────────────────────────────────────────────────
  { code: "GB", name: "United Kingdom",     phoneCode: "+44",  currency: "GBP", zipRegex: /^[A-Za-z]{1,2}\d{1,2}[A-Za-z]?\s?\d[A-Za-z]{2}$/ },
  { code: "FR", name: "France",             phoneCode: "+33",  currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "DE", name: "Germany",            phoneCode: "+49",  currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "IT", name: "Italy",              phoneCode: "+39",  currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "ES", name: "Spain",              phoneCode: "+34",  currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "PT", name: "Portugal",           phoneCode: "+351", currency: "EUR", zipRegex: /^\d{4}-\d{3}$/ },
  { code: "NL", name: "Netherlands",        phoneCode: "+31",  currency: "EUR", zipRegex: /^\d{4}\s?[A-Za-z]{2}$/ },
  { code: "BE", name: "Belgium",            phoneCode: "+32",  currency: "EUR", zipRegex: /^\d{4}$/ },
  { code: "CH", name: "Switzerland",        phoneCode: "+41",  currency: "CHF", zipRegex: /^\d{4}$/ },
  { code: "AT", name: "Austria",            phoneCode: "+43",  currency: "EUR", zipRegex: /^\d{4}$/ },
  { code: "IE", name: "Ireland",            phoneCode: "+353", currency: "EUR", zipRegex: /^[A-Za-z]\d{2}\s?[A-Za-z\d]{4}$/ },

  // ── Northern Europe ───────────────────────────────────────────────────
  { code: "SE", name: "Sweden",             phoneCode: "+46",  currency: "SEK", zipRegex: /^\d{3}\s?\d{2}$/ },
  { code: "NO", name: "Norway",             phoneCode: "+47",  currency: "NOK", zipRegex: /^\d{4}$/ },
  { code: "DK", name: "Denmark",            phoneCode: "+45",  currency: "DKK", zipRegex: /^\d{4}$/ },
  { code: "FI", name: "Finland",            phoneCode: "+358", currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "IS", name: "Iceland",            phoneCode: "+354", currency: "ISK", zipRegex: /^\d{3}$/ },

  // ── Southern / Eastern Europe ─────────────────────────────────────────
  { code: "GR", name: "Greece",             phoneCode: "+30",  currency: "EUR", zipRegex: /^\d{3}\s?\d{2}$/ },
  { code: "HR", name: "Croatia",            phoneCode: "+385", currency: "EUR", zipRegex: /^\d{5}$/ },
  { code: "PL", name: "Poland",             phoneCode: "+48",  currency: "PLN", zipRegex: /^\d{2}-\d{3}$/ },
  { code: "CZ", name: "Czechia",            phoneCode: "+420", currency: "CZK", zipRegex: /^\d{3}\s?\d{2}$/ },
  { code: "HU", name: "Hungary",            phoneCode: "+36",  currency: "HUF", zipRegex: /^\d{4}$/ },

  // ── East Asia ─────────────────────────────────────────────────────────
  { code: "JP", name: "Japan",              phoneCode: "+81",  currency: "JPY", zipRegex: /^\d{3}-?\d{4}$/ },
  { code: "KR", name: "South Korea",        phoneCode: "+82",  currency: "KRW", zipRegex: /^\d{5}$/ },
  { code: "CN", name: "China",              phoneCode: "+86",  currency: "CNY", zipRegex: /^\d{6}$/ },
  { code: "HK", name: "Hong Kong",          phoneCode: "+852", currency: "HKD", zipRegex: /^.*$/ },
  { code: "TW", name: "Taiwan",             phoneCode: "+886", currency: "TWD", zipRegex: /^\d{3}(\d{2})?$/ },

  // ── Southeast Asia ────────────────────────────────────────────────────
  { code: "SG", name: "Singapore",          phoneCode: "+65",  currency: "SGD", zipRegex: /^\d{6}$/ },
  { code: "TH", name: "Thailand",           phoneCode: "+66",  currency: "THB", zipRegex: /^\d{5}$/ },
  { code: "MY", name: "Malaysia",           phoneCode: "+60",  currency: "MYR", zipRegex: /^\d{5}$/ },
  { code: "ID", name: "Indonesia",          phoneCode: "+62",  currency: "IDR", zipRegex: /^\d{5}$/ },
  { code: "VN", name: "Vietnam",            phoneCode: "+84",  currency: "VND", zipRegex: /^\d{6}$/ },
  { code: "PH", name: "Philippines",        phoneCode: "+63",  currency: "PHP", zipRegex: /^\d{4}$/ },

  // ── South Asia ────────────────────────────────────────────────────────
  { code: "IN", name: "India",              phoneCode: "+91",  currency: "INR", zipRegex: /^\d{6}$/ },
  { code: "LK", name: "Sri Lanka",          phoneCode: "+94",  currency: "LKR", zipRegex: /^\d{5}$/ },

  // ── Middle East ───────────────────────────────────────────────────────
  { code: "AE", name: "United Arab Emirates", phoneCode: "+971", currency: "AED", zipRegex: /^.*$/ },
  { code: "SA", name: "Saudi Arabia",       phoneCode: "+966", currency: "SAR", zipRegex: /^\d{5}(-\d{4})?$/ },
  { code: "QA", name: "Qatar",              phoneCode: "+974", currency: "QAR", zipRegex: /^.*$/ },
  { code: "OM", name: "Oman",               phoneCode: "+968", currency: "OMR", zipRegex: /^\d{3}$/ },
  { code: "IL", name: "Israel",             phoneCode: "+972", currency: "ILS", zipRegex: /^\d{5}(\d{2})?$/ },
  { code: "JO", name: "Jordan",             phoneCode: "+962", currency: "JOD", zipRegex: /^\d{5}$/ },

  // ── Africa ────────────────────────────────────────────────────────────
  { code: "EG", name: "Egypt",              phoneCode: "+20",  currency: "EGP", zipRegex: /^\d{5}$/ },
  { code: "MA", name: "Morocco",            phoneCode: "+212", currency: "MAD", zipRegex: /^\d{5}$/ },
  { code: "ZA", name: "South Africa",       phoneCode: "+27",  currency: "ZAR", zipRegex: /^\d{4}$/ },
  { code: "KE", name: "Kenya",              phoneCode: "+254", currency: "KES", zipRegex: /^\d{5}$/ },

  // ── Oceania ───────────────────────────────────────────────────────────
  { code: "AU", name: "Australia",          phoneCode: "+61",  currency: "AUD", zipRegex: /^\d{4}$/ },
  { code: "NZ", name: "New Zealand",        phoneCode: "+64",  currency: "NZD", zipRegex: /^\d{4}$/ },
];

const COUNTRIES_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string | undefined): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES_BY_CODE.get(code.toUpperCase());
}

/** Sorted alphabetically by display name — what the dropdown shows. */
export const COUNTRIES_ALPHABETICAL: Country[] = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name),
);
