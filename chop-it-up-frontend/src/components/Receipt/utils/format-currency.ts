export function truncateToTwoDecimals(val: number): string {
  const str = val.toString();
  if (str.includes(".")) {
    const [intPart, decPart] = str.split(".");
    return intPart + "." + (decPart + "00").slice(0, 2);
  } else {
    return str + ".00";
  }
}

export function formatCurrency(val: number): string {
  return "$" + truncateToTwoDecimals(val);
}
