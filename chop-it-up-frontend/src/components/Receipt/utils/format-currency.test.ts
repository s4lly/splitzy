import { formatCurrency, truncateToTwoDecimals } from "./format-currency";
import { describe, it, expect } from "vitest";

describe("truncateToTwoDecimals", () => {
  it("truncates to two decimals without rounding", () => {
    expect(truncateToTwoDecimals(12.345)).toBe("12.34");
    expect(truncateToTwoDecimals(12.349)).toBe("12.34");
    expect(truncateToTwoDecimals(0.999)).toBe("0.99");
    expect(truncateToTwoDecimals(1)).toBe("1.00");
    expect(truncateToTwoDecimals(0)).toBe("0.00");
    expect(truncateToTwoDecimals(-1.567)).toBe("-1.56");
    expect(truncateToTwoDecimals(1000000.1234)).toBe("1000000.12");
  });

  it("handles string input by coercion", () => {
    // @ts-expect-error
    expect(truncateToTwoDecimals("12.345")).toBe("12.34");
  });
});

describe("formatCurrency", () => {
  it("formats positive numbers as $X.XX", () => {
    expect(formatCurrency(12.34)).toBe("$12.34");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1000)).toBe("$1000.00");
  });

  it("formats negative numbers as $-X.XX", () => {
    expect(formatCurrency(-12.34)).toBe("$-12.34");
    expect(formatCurrency(-0.01)).toBe("$-0.01");
  });

  it("truncates and formats numbers with more than two decimals", () => {
    expect(formatCurrency(12.349)).toBe("$12.34");
    expect(formatCurrency(0.999)).toBe("$0.99");
  });

  it("handles large numbers", () => {
    expect(formatCurrency(1234567.89123)).toBe("$1234567.89");
  });
}); 