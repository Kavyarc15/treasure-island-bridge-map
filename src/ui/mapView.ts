import type { Graph, ReplayState } from '../engine';
import { esc, splitName } from './dom';

export const MAP_W = 820;
export const MAP_H = 520;
const W = MAP_W;
const H = MAP_H;
const R = 25;

// Room left around the islands for names (top) and the d/low pill (bottom).
const MARGIN = { left: 80, right: 80, top: 62, bottom: 80 };
const MAX_PX_PER_UNIT = 12;

export interface Point {
  x: number;
  y: number;
}

/**
 * Fits any set of 0..100 layout coordinates into the SVG with margins, so an
 * island can never be clipped (coordinates are presentation only). The
 * bounding box is centred; tiny or zero spans are not stretched.
 */
export function projectNodes(nodes: Array<{ id: string; x: number; y: number }>): Map<string, Point> {
  const out = new Map<string, Point>();
  if (nodes.length === 0) return out;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const availW = W - MARGIN.left - MARGIN.right;
  const availH = H - MARGIN.top - MARGIN.bottom;
  const sx = maxX > minX ? Math.min(availW / (maxX - minX), MAX_PX_PER_UNIT) : 0;
  const sy = maxY > minY ? Math.min(availH / (maxY - minY), MAX_PX_PER_UNIT) : 0;
  const cx = MARGIN.left + availW / 2;
  const cy = MARGIN.top + availH / 2;
  for (const n of nodes) {
    out.set(n.id, { x: cx + (n.x - (minX + maxX) / 2) * sx, y: cy + (n.y - (minY + maxY) / 2) * sy });
  }
  return out;
}

/**
 * Draws the island map from the folded replay state. Every state is shown with
 * a colour AND a symbol / text / line style (accessible without colour):
 *   node: unvisited (dashed ring, "not visited"), current ("▶ NOW", thick ring),
 *         visited (solid ring + d/low), articulation ("◆ CUT", double ring)
 *   edge: unvisited (thin grey), DFS tree (solid), inspected non-tree (dotted),
 *         bridge (thick red dashes + "⚠" label)
 */
export function renderMap(graph: Graph, view: ReplayState): string {
  const pos = projectNodes(graph.nodes);
  const parts: string[] = [];

  parts.push(
    `<svg id="map" class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Island and bridge map" xmlns="http://www.w3.org/2000/svg">`,
  );
  parts.push(`<rect class="sea" x="0" y="0" width="${W}" height="${H}" rx="18"/>`);

  // ---- bridges: lines are drawn first (under the islands) ...
  const labels: string[] = [];
  for (const e of graph.edges) {
    const a = pos.get(e.a)!;
    const b = pos.get(e.b)!;
    const state = view.edges[e.id];
    const isCurrent = view.currentEdge === e.id;
    const label = state === 'bridge' ? `⚠ ${e.id}` : e.id;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const w = label.length * 7.4 + 12;
    const title = `${e.id}: ${e.a} – ${e.b} (${edgeWords(state)})`;
    parts.push(`<g class="bridge b-${state}${isCurrent ? ' b-current' : ''}" data-edge="${esc(e.id)}">`);
    parts.push(`<title>${esc(title)}</title>`);
    if (isCurrent) parts.push(`<line class="halo" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    parts.push(`<line class="line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    parts.push(`</g>`);
    // ... and their labels last, on top of everything, so they are never hidden
    labels.push(
      `<g class="blabel b-${state}${isCurrent ? ' b-current' : ''}" data-label-for="${esc(e.id)}">` +
        `<rect class="pill" x="${mx - w / 2}" y="${my - 10}" width="${w}" height="20" rx="10"/>` +
        `<text class="pill-text" x="${mx}" y="${my + 4}" text-anchor="middle">${esc(label)}</text></g>`,
    );
  }

  // ---- islands
  for (const n of graph.nodes) {
    const p = pos.get(n.id)!;
    const v = view.nodes[n.id];
    const isCurrent = view.currentNode === n.id;
    const isRelated = view.relatedNodes.includes(n.id);
    const cls = [
      'island',
      `n-${v.status}`,
      v.articulation ? 'n-art' : '',
      isCurrent ? 'n-current' : '',
      isRelated ? 'n-related' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const [mainName] = splitName(n.name);
    const fs = Math.max(8, Math.min(12.5, 40 / Math.max(3, n.id.length) * 1.7));
    const line1 = v.discovery === null ? 'not visited' : `d=${v.discovery}  low=${v.low}`;
    const tags: string[] = [];
    if (isCurrent) tags.push('▶ NOW');
    else if (isRelated) tags.push('◁ target');
    if (v.articulation) tags.push('◆ CUT');
    const line2 = tags.join(' · ');
    const pillW = Math.max(line1.length, line2.length) * 6.5 + 14;
    const tooltip = `${n.id} · ${n.name} · ${
      v.discovery === null ? 'not visited' : `discovery ${v.discovery}, low ${v.low}, parent ${v.parent ?? 'none (root)'}`
    }${v.articulation ? ' · ARTICULATION ISLAND' : ''}`;

    parts.push(`<g class="${cls}" data-node="${esc(n.id)}" transform="translate(${p.x} ${p.y})">`);
    parts.push(`<title>${esc(tooltip)}</title>`);
    if (v.articulation) parts.push(`<circle class="art-ring" r="${R + 7}"/>`);
    if (isRelated) parts.push(`<circle class="rel-ring" r="${R + 11}"/>`);
    if (isCurrent) parts.push(`<circle class="cur-ring" r="${R + 5}"/>`);
    parts.push(`<circle class="body" r="${R}"/>`);
    parts.push(`<text class="id" y="${fs * 0.36}" text-anchor="middle" font-size="${fs}">${esc(n.id)}</text>`);
    if (v.articulation) {
      parts.push(`<circle class="art-badge" cx="${R - 2}" cy="${-R + 2}" r="9"/><text class="art-badge-t" x="${R - 2}" y="${-R + 6}" text-anchor="middle">◆</text>`);
    }
    parts.push(`<text class="name" y="${-R - (v.articulation ? 12 : 8)}" text-anchor="middle">${esc(mainName)}</text>`);
    parts.push(
      `<rect class="state-pill" x="${-pillW / 2}" y="${R + 6}" width="${pillW}" height="${line2 ? 31 : 18}" rx="7"/>` +
        `<text class="state-l1" y="${R + 19}" text-anchor="middle">${esc(line1)}</text>` +
        (line2 ? `<text class="state-l2" y="${R + 32}" text-anchor="middle">${esc(line2)}</text>` : ''),
    );
    parts.push(`</g>`);
  }

  parts.push(labels.join(''));
  parts.push(`</svg>`);
  return parts.join('');
}

function edgeWords(state: string): string {
  switch (state) {
    case 'tree': return 'DFS tree edge';
    case 'non-tree': return 'inspected non-tree connection';
    case 'bridge': return 'BRIDGE';
    default: return 'not inspected yet';
  }
}

/** Legend: each state shown with its colour AND its symbol / line style. */
export function renderLegend(): string {
  const line = (cls: string, text: string): string =>
    `<li><svg width="46" height="16" viewBox="0 0 46 16" aria-hidden="true"><g class="bridge ${cls}"><line class="line" x1="3" y1="8" x2="43" y2="8"/></g></svg><span>${text}</span></li>`;
  const node = (cls: string, inner: string, text: string): string =>
    `<li><svg width="46" height="38" viewBox="-23 -19 46 38" aria-hidden="true"><g class="island ${cls}">${inner}<circle class="body" r="13"/></g></svg><span>${text}</span></li>`;
  return `
  <ul class="legend" aria-label="Map legend">
    ${node('n-unvisited', '', '<b>Unvisited</b> · dashed ring, “not visited”')}
    ${node('n-active n-current', '<circle class="cur-ring" r="17"/>', '<b>Current</b> · thick ring, “▶ NOW”')}
    ${node('n-done', '', '<b>Visited</b> · shows d (discovery) and low')}
    ${node('n-done n-art', '<circle class="art-ring" r="18"/>', '<b>Articulation island</b> · double ring, “◆ CUT”')}
    ${line('b-unvisited', '<b>Bridge not inspected</b> · thin grey line')}
    ${line('b-tree', '<b>DFS tree</b> · solid teal line')}
    ${line('b-non-tree', '<b>Inspected non-tree</b> · dotted amber line (a loop)')}
    ${line('b-bridge', '<b>Bridge</b> · thick red dashes, “⚠”')}
  </ul>`;
}
