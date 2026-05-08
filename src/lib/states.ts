// Administrative regions for countries with formal "state" systems where
// users typically expect a dropdown rather than a free-text region. For
// other countries, the booking form falls back to a plain text input.
//
// US/CA/AU/IN/MX/BR are covered; everything else is free-text.

export type StateOption = { code: string; name: string };

const US_STATES: StateOption[] = [
  { code: "AL", name: "Alabama" },         { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },         { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },      { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },     { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },         { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },          { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },        { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },            { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },        { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },           { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },   { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },       { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },        { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },        { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },   { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },      { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },            { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },          { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },    { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },    { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },           { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },         { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },      { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },       { code: "WY", name: "Wyoming" },
];

const CA_PROVINCES: StateOption[] = [
  { code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" }, { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" }, { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" }, { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" }, { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Québec" }, { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const AU_STATES: StateOption[] = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" }, { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" }, { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" }, { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
];

const IN_STATES: StateOption[] = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" }, { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" }, { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" }, { code: "CT", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" }, { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" }, { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" }, { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" }, { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" }, { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" }, { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" }, { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" }, { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" }, { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" }, { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" }, { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" }, { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" }, { code: "UP", name: "Uttar Pradesh" },
  { code: "UT", name: "Uttarakhand" }, { code: "WB", name: "West Bengal" },
];

const MX_STATES: StateOption[] = [
  { code: "AGU", name: "Aguascalientes" }, { code: "BCN", name: "Baja California" },
  { code: "BCS", name: "Baja California Sur" }, { code: "CAM", name: "Campeche" },
  { code: "CHP", name: "Chiapas" }, { code: "CHH", name: "Chihuahua" },
  { code: "CMX", name: "Mexico City" }, { code: "COA", name: "Coahuila" },
  { code: "COL", name: "Colima" }, { code: "DUR", name: "Durango" },
  { code: "GUA", name: "Guanajuato" }, { code: "GRO", name: "Guerrero" },
  { code: "HID", name: "Hidalgo" }, { code: "JAL", name: "Jalisco" },
  { code: "MEX", name: "México (state)" }, { code: "MIC", name: "Michoacán" },
  { code: "MOR", name: "Morelos" }, { code: "NAY", name: "Nayarit" },
  { code: "NLE", name: "Nuevo León" }, { code: "OAX", name: "Oaxaca" },
  { code: "PUE", name: "Puebla" }, { code: "QUE", name: "Querétaro" },
  { code: "ROO", name: "Quintana Roo" }, { code: "SLP", name: "San Luis Potosí" },
  { code: "SIN", name: "Sinaloa" }, { code: "SON", name: "Sonora" },
  { code: "TAB", name: "Tabasco" }, { code: "TAM", name: "Tamaulipas" },
  { code: "TLA", name: "Tlaxcala" }, { code: "VER", name: "Veracruz" },
  { code: "YUC", name: "Yucatán" }, { code: "ZAC", name: "Zacatecas" },
];

const BR_STATES: StateOption[] = [
  { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" }, { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" }, { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" }, { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" }, { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" }, { code: "PA", name: "Pará" }, { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" }, { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" }, { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" }, { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" }, { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" }, { code: "TO", name: "Tocantins" },
];

/**
 * State/region lookup by country code. Returns an empty list when the
 * country has no formal subdivision system or we don't curate one — the
 * form should fall back to a free-text input in that case.
 */
export function statesForCountry(countryCode: string | undefined): StateOption[] {
  switch ((countryCode ?? "").toUpperCase()) {
    case "US": return US_STATES;
    case "CA": return CA_PROVINCES;
    case "AU": return AU_STATES;
    case "IN": return IN_STATES;
    case "MX": return MX_STATES;
    case "BR": return BR_STATES;
    default:   return [];
  }
}

export function hasStateDropdown(countryCode: string | undefined): boolean {
  return statesForCountry(countryCode).length > 0;
}
