/**
 * Converts an ISO 3166-1 alpha-2 country code to a flag emoji.
 * For example: "US" → "🇺🇸", "GB" → "🇬🇧"
 */
export function getCountryFlag(code: string | null): string {
  if (!code || code.length !== 2) {
    return "";
  }

  const codeUpper = code.toUpperCase();
  // Regional indicator symbols: U+1F1E6-U+1F1FF (🇦-🇿)
  return Array.from(codeUpper)
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 0x1f1a5))
    .join("");
}
