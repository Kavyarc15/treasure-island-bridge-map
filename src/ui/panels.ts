import { describeEvent, sortedIds } from '../engine';
import type { Graph, ReplayState, ValidationError } from '../engine';
import { esc } from './dom';

const TONE_ICON: Record<string, string> = {
  info: 'ℹ',
  update: '↓',
  safe: '✓',
  bridge: '⚠',
  articulation: '◆',
  done: '★',
};

function namesOf(graph: Graph): Record<string, string> {
  return Object.fromEntries(graph.nodes.map((n) => [n.id, n.name]));
}

/** The current event: highlighted subject, plain-language text and the exact numbers. */
export function renderEventCard(graph: Graph, view: ReplayState): string {
  const ev = view.currentEvent;
  if (!ev) {
    return `
    <section class="card event tone-info" aria-labelledby="ev-h">
      <h2 id="ev-h">Current event <span class="count">0 / ${view.total}</span></h2>
      <p class="headline">Ready. Nothing has been inspected yet.</p>
      <p class="detail">Press <b>Step</b> to watch the inspection one move at a time, or <b>Run to End</b> to see the finished result.
      Each island gets two numbers: <b>d</b> (the moment it was first reached) and <b>low</b> (the earliest moment it can get back to by any route that avoids its own parent bridge).
      A bridge is critical when the branch below it cannot get back above it.</p>
    </section>`;
  }
  const d = describeEvent(ev, namesOf(graph));
  return `
    <section class="card event tone-${d.tone}" aria-labelledby="ev-h">
      <h2 id="ev-h">Current event <span class="count">${view.index} / ${view.total}</span></h2>
      <p class="type"><span class="icon" aria-hidden="true">${TONE_ICON[d.tone]}</span> ${esc(ev.type)}</p>
      <p class="headline" role="status" aria-live="polite">${esc(d.headline)}</p>
      <p class="detail">${esc(d.detail)}</p>
      ${
        d.proof.length
          ? `<div class="proof" aria-label="Numerical proof">${d.proof.map((p) => `<code>${esc(p)}</code>`).join('')}</div>`
          : ''
      }
    </section>`;
}

/** Compact node table: ID, parent, discovery, low, state. */
export function renderTable(view: ReplayState): string {
  const rows = sortedIds(Object.keys(view.nodes))
    .map((id) => {
      const v = view.nodes[id];
      const cls = [
        view.currentNode === id ? 'cur' : '',
        view.relatedNodes.includes(id) ? 'rel' : '',
        v.articulation ? 'art' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const parent = v.parent === undefined ? '–' : v.parent === null ? 'null (root)' : v.parent;
      const state = [
        v.status === 'unvisited' ? 'unvisited' : v.status === 'active' ? 'in progress' : 'done',
        v.articulation ? '◆ articulation' : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<tr class="${cls}"><th scope="row">${view.currentNode === id ? '▶ ' : ''}${esc(id)}</th><td>${esc(parent)}</td><td class="num">${
        v.discovery ?? '–'
      }</td><td class="num">${v.low ?? '–'}</td><td>${esc(state)}</td></tr>`;
    })
    .join('');
  return `
    <section class="card" aria-labelledby="tb-h">
      <h2 id="tb-h">Node table</h2>
      <table class="nodes">
        <thead><tr><th>ID</th><th>Parent</th><th class="num" title="discovery time">Disc</th><th class="num" title="lowest discovery time reachable">Low</th><th>State</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

/** Nodes that would be cut off from the root side if `edgeId` (a bridge) closed. */
function cutOffByBridge(graph: Graph, view: ReplayState, edgeId: string): string[] {
  const edge = graph.edges.find((e) => e.id === edgeId);
  if (!edge) return [];
  const childOf = (c: string, p: string): boolean => view.nodes[c].parent === p;
  const child = childOf(edge.b, edge.a) ? edge.b : childOf(edge.a, edge.b) ? edge.a : null;
  if (child === null) return [];
  const below = (id: string): boolean => {
    let cur: string | null | undefined = id;
    while (cur) {
      if (cur === child) return true;
      cur = view.nodes[cur].parent;
    }
    return false;
  };
  return sortedIds(Object.keys(view.nodes).filter(below));
}

/** Component count and sorted critical-item summaries. */
export function renderSummary(graph: Graph, view: ReplayState): string {
  const names = namesOf(graph);
  const final = view.finished;
  const bridges = view.bridges
    .map((id) => {
      const e = graph.edges.find((x) => x.id === id)!;
      const cut = cutOffByBridge(graph, view, id);
      return `<li><b>⚠ ${esc(id)}</b> <span class="muted">${esc(e.a)} – ${esc(e.b)}</span>${
        cut.length ? `<div class="why">If it closes, this part is cut off: ${esc(cut.join(', '))}</div>` : ''
      }</li>`;
    })
    .join('');
  const arts = view.articulationPoints
    .map((id) => `<li><b>◆ ${esc(id)}</b> <span class="muted">${esc(names[id] ?? '')}</span></li>`)
    .join('');
  const none = (what: string): string =>
    `<li class="none">${final ? `None: ${what}` : 'none found yet'}</li>`;
  return `
    <section class="card summary ${final ? 'final' : ''}" aria-labelledby="sm-h">
      <h2 id="sm-h">${final ? 'Final safety summary' : 'Safety summary so far'}</h2>
      <p class="comp"><span class="big">${view.componentsStarted}</span> component${view.componentsStarted === 1 ? '' : 's'}${
        final ? '' : ' started so far'
      }</p>
      <h3>Critical bridges <span class="count">${view.bridges.length}</span></h3>
      <ul>${bridges || none('every bridge has an alternate route.')}</ul>
      <h3>Articulation islands <span class="count">${view.articulationPoints.length}</span></h3>
      <ul>${arts || none('no single island splits the festival.')}</ul>
    </section>`;
}

/** Every event applied so far, in order; the newest one is highlighted. */
export function renderHistory(graph: Graph, view: ReplayState, events: Array<{ index: number; type: string }>): string {
  const names = namesOf(graph);
  const items = events
    .slice(0, view.index)
    .map((e, i) => {
      const d = describeEvent(e as never, names);
      const now = i === view.index - 1;
      return `<li class="${now ? 'now' : ''} tone-${d.tone}" ${now ? 'aria-current="step"' : ''}><span class="ix">#${i + 1}</span><span class="ty">${esc(
        e.type,
      )}</span><span class="tx">${esc(d.headline)}${d.proof[0] ? ` <code>${esc(d.proof[0])}</code>` : ''}</span></li>`;
    })
    .join('');
  return `
    <section class="card history" aria-labelledby="hs-h">
      <h2 id="hs-h">Event history <span class="count">${view.index} of ${view.total} shown</span></h2>
      ${items ? `<ol id="history-list">${items}</ol>` : '<p class="muted">No events yet. Press Step.</p>'}
    </section>`;
}

export function renderErrors(errors: ValidationError[]): string {
  return `
    <section class="card errors" role="alert" aria-labelledby="er-h">
      <h2 id="er-h">⛔ This archipelago is not valid</h2>
      <p>Nothing was analysed. Any earlier replay and results have been cleared.</p>
      <ul>${errors
        .map((e) => `<li><code>${esc(e.code)}</code> ${esc(e.message)}</li>`)
        .join('')}</ul>
    </section>`;
}
