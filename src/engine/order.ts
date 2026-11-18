/**
 * Plain code-unit comparison. For the allowed ID alphabet ([A-Z0-9_-]) this is
 * exactly ascending ASCII order. Never use localeCompare or natural sort here:
 * they order "A10" and "A2" differently and would break determinism.
 */
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortedIds(ids: Iterable<string>): string[] {
  return [...ids].sort(compareIds);
}
