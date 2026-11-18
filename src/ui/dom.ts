/** Escapes text before it is placed into an HTML / SVG string. */
export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "Harbour Market (food stalls)" -> ["Harbour Market", "food stalls"] */
export function splitName(name: string): [string, string] {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(name);
  return m ? [m[1], m[2]] : [name, ''];
}
