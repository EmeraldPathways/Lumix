export function formatSigned(value: number) {
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return value > 0 ? `+${display}` : display;
}
