// Independent reference implementations used ONLY by tests.

import type { Graph } from '../src/engine';

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export interface ReferenceResult {
  table: Array<{ id: string; parent: string | null; discovery: number; low: number }>;
  bridges: string[];
  articulation: string[];
  components: number;
}

/** Iterative (explicit stack) low-link: a different style from the engine's recursion. */
export function iterativeLowLink(graph: Graph): ReferenceResult {
  const adj = new Map<string, Array<{ v: string; e: string }>>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    adj.get(e.a)!.push({ v: e.b, e: e.id });
    adj.get(e.b)!.push({ v: e.a, e: e.id });
  }
  for (const list of adj.values()) list.sort((p, q) => cmp(p.v, q.v));

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const bridges = new Set<string>();
  const art = new Set<string>();
  const rootChildren = new Map<string, number>();
  let clock = 0;
  let components = 0;

  for (const root of graph.nodes.map((n) => n.id).sort(cmp)) {
    if (disc.has(root)) continue;
    components += 1;
    disc.set(root, clock); low.set(root, clock); parent.set(root, null); clock += 1;
    rootChildren.set(root, 0);
    const stack: Array<{ u: string; i: number; viaEdge: string | null }> = [{ u: root, i: 0, viaEdge: null }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const list = adj.get(top.u)!;
      if (top.i < list.length) {
        const { v, e } = list[top.i++];
        if (v === parent.get(top.u)) continue;
        if (!disc.has(v)) {
          parent.set(v, top.u); disc.set(v, clock); low.set(v, clock); clock += 1;
          stack.push({ u: v, i: 0, viaEdge: e });
        } else {
          low.set(top.u, Math.min(low.get(top.u)!, disc.get(v)!));
        }
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1].u;
          low.set(p, Math.min(low.get(p)!, low.get(top.u)!));
          if (low.get(top.u)! > disc.get(p)!) bridges.add(top.viaEdge!);
          if (parent.get(p) === null) rootChildren.set(p, rootChildren.get(p)! + 1);
          else if (low.get(top.u)! >= disc.get(p)!) art.add(p);
        }
      }
    }
    if (rootChildren.get(root)! >= 2) art.add(root);
  }

  return {
    table: [...disc.keys()].sort(cmp).map((id) => ({
      id, parent: parent.get(id)!, discovery: disc.get(id)!, low: low.get(id)!,
    })),
    bridges: [...bridges].sort(cmp),
    articulation: [...art].sort(cmp),
    components,
  };
}

function countComponents(nodeIds: string[], edges: Array<{ a: string; b: string }>): number {
  const ids = new Set(nodeIds);
  const adj = new Map<string, string[]>(nodeIds.map((n) => [n, []]));
  for (const e of edges) {
    if (ids.has(e.a) && ids.has(e.b)) { adj.get(e.a)!.push(e.b); adj.get(e.b)!.push(e.a); }
  }
  const seen = new Set<string>();
  let count = 0;
  for (const n of nodeIds) {
    if (seen.has(n)) continue;
    count += 1;
    const st = [n];
    while (st.length) {
      const x = st.pop()!;
      if (seen.has(x)) continue;
      seen.add(x);
      st.push(...adj.get(x)!);
    }
  }
  return count;
}

/** Bridges / articulation points by DEFINITION: remove it and count components. */
export function bruteForceCritical(graph: Graph): { bridges: string[]; articulation: string[]; components: number } {
  const ids = graph.nodes.map((n) => n.id);
  const base = countComponents(ids, graph.edges);
  const bridges = graph.edges
    .filter((e) => countComponents(ids, graph.edges.filter((x) => x.id !== e.id)) > base)
    .map((e) => e.id)
    .sort(cmp);
  const articulation = ids
    .filter((n) => countComponents(ids.filter((x) => x !== n), graph.edges) > base)
    .sort(cmp);
  return { bridges, articulation, components: base };
}
