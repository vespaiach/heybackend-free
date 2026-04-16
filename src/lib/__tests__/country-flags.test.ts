import { describe, expect, it } from "vitest";
import { getCountryFlag } from "../country-flags";

describe("getCountryFlag", () => {
  it("converts 2-letter country codes to flag emojis", () => {
    expect(getCountryFlag("US")).toBe("🇺🇸");
    expect(getCountryFlag("GB")).toBe("🇬🇧");
    expect(getCountryFlag("JP")).toBe("🇯🇵");
    expect(getCountryFlag("FR")).toBe("🇫🇷");
    expect(getCountryFlag("DE")).toBe("🇩🇪");
  });

  it("handles lowercase country codes", () => {
    expect(getCountryFlag("us")).toBe("🇺🇸");
    expect(getCountryFlag("gb")).toBe("🇬🇧");
  });

  it("returns empty string for null or undefined", () => {
    expect(getCountryFlag(null)).toBe("");
    expect(getCountryFlag(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for invalid country codes", () => {
    expect(getCountryFlag("USA")).toBe("");
    expect(getCountryFlag("U")).toBe("");
    expect(getCountryFlag("")).toBe("");
  });
});
