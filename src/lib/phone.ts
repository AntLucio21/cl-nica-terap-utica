export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Strip a leading 55 country code when present. */
export function localDigits(v: string): string {
  const d = onlyDigits(v);
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

/** Valid: 10 digits (landline) or 11 digits whose 3rd digit is 9 (mobile). */
export function isValidBrPhone(v: string): boolean {
  const d = localDigits(v);
  return d.length === 10 || (d.length === 11 && d[2] === "9");
}

/** Stored form: 55 + DDD + number, digits only. */
export function toStoredPhone(v: string): string {
  const d = localDigits(v);
  return d ? `55${d}` : "";
}

/** Input mask while typing: (84) 98643-8775 or (84) 8643-8775. */
export function maskBrPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2), rest = d.slice(2);
  const split = d.length === 11 ? 5 : 4;
  return rest.length > split ? `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}` : `(${ddd}) ${rest}`;
}

export const formatBrPhone = (stored: string) => (stored ? maskBrPhone(localDigits(stored)) : "");
