export function truncateToTwoDecimals(val: number): string {
  const str = val.toString();
  if (str.includes(".")) {
    const [intPart, decPart] = str.split(".");
    return intPart + "." + (decPart + "00").slice(0, 2);
  } else {
    return str + ".00";
  }
}

export function truncateFloatByNDecimals(val: number, n: number): number {
  return Math.trunc(val * 10 ** n) / 10 ** n;
}

export function formatCurrency(val: number): string {
  return "$" + truncateToTwoDecimals(val);
}
