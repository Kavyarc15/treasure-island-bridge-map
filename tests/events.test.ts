import { describe, expect, it } from 'vitest';
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { CYCLE_ONLY, ROOT_TWO_CHILDREN_DISCONNECTED } from '../src/data/samples';
import { describeEvent } from '../src/engine';
import type { Graph } from '../src/engine';
import { analyzeOk, makeGraph, rng } from './helpers';
import { bruteForceCritical, iterativeLowLink } from './reference';

const graphs: Array<[string, Graph]> = [
  ['main', MAIN_ARCHIPELAGO],
  ['cycle-only', CYCLE_ONLY],
  ['root+disconnected+isolated', ROOT_TWO_CHILDREN_DISCONNECTED],
];

describe.each(graphs)('event ordering (%s)', (_name, graph) => {
  const a = analyzeOk(graph);
  const ev = a.events;

  it('indices are consecutive from 0 and FINISH is the single last event', () => {
    ev.forEach((e, i) => expect(e.index).toBe(i));
    expect(ev.filter((e) => e.type === 'FINISH').length).toBe(1);
    expect(ev[ev.length - 1].type).toBe('FINISH');
  });

  it('each component: COMPONENT_START, then DISCOVER of that root, ..., COMPONENT_COMPLETE', () => {
    ev.forEach((e, i) => {
      if (e.type === 'COMPONENT_START') {
        expect(ev[i + 1]).toMatchObject({ type: 'DISCOVER', node: e.root, parent: null });
      }
    });
    const starts = ev.filter((e) => e.type === 'COMPONENT_START').length;
    const ends = ev.filter((e) => e.type === 'COMPONENT_COMPLETE').length;
    expect(starts).toBe(ends);
    expect(starts).toBe(a.componentCount);
  });

  it('a tree INSPECT_EDGE is immediately followed by DISCOVER of the child', () => {
    ev.forEach((e, i) => {
      if (e.type === 'INSPECT_EDGE' && e.kind === 'tree') {
        expect(ev[i + 1]).toMatchObject({ type: 'DISCOVER', node: e.to, parent: e.from });
      }
    });
  });

  it('after a child finishes: NODE_COMPLETE(child) < RETURN_FROM_CHILD, then CLASSIFY_EDGE right after', () => {
    ev.forEach((e, i) => {
      if (e.type !== 'RETURN_FROM_CHILD') return;
      const completeIdx = ev.findIndex((x) => x.type === 'NODE_COMPLETE' && x.node === e.child);
      expect(completeIdx).toBeGreaterThan(-1);
      expect(completeIdx).toBeLessThan(i);
      expect(ev[i + 1]).toMatchObject({ type: 'CLASSIFY_EDGE', edge: e.edge, parent: e.node, child: e.child });
      const after = ev[i + 2];
      if (after.type === 'ARTICULATION' && after.reason === 'non-root') {
        // non-root rule fires right after the classification of the child that triggered it
        expect(after).toMatchObject({ node: e.node, child: e.child });
      } else if (after.type === 'ARTICULATION') {
        // root rule: only emitted when the root finishes, i.e. after its last child returned
        expect(after).toMatchObject({ node: e.node, reason: 'root-two-children' });
        expect(ev[i + 3]).toMatchObject({ type: 'NODE_COMPLETE', node: e.node });
      }
    });
  });

  it('the root articulation event comes right before the root NODE_COMPLETE', () => {
    ev.forEach((e, i) => {
      if (e.type === 'ARTICULATION' && e.reason === 'root-two-children') {
        expect(ev[i + 1]).toMatchObject({ type: 'NODE_COMPLETE', node: e.node });
      }
    });
  });

  it('every undirected bridge is inspected exactly twice, once from each end', () => {
    for (const edge of graph.edges) {
      const seen = ev.filter((e) => e.type === 'INSPECT_EDGE' && e.edge === edge.id);
      expect(seen.length, edge.id).toBe(2);
      const ends = seen.map((s) => (s.type === 'INSPECT_EDGE' ? s.from : '')).sort();
      expect(ends).toEqual([edge.a, edge.b].sort());
    }
  });

  it('a node is completed only after all of its own INSPECT_EDGE events', () => {
    ev.forEach((e, i) => {
      if (e.type !== 'NODE_COMPLETE') return;
      const later = ev.slice(i + 1).some((x) => x.type === 'INSPECT_EDGE' && x.from === e.node);
      expect(later).toBe(false);
    });
  });

  it('events are plain data: running twice gives deep-equal histories', () => {
    expect(analyzeOk(graph).events).toEqual(ev);
  });
});

describe('inspect kinds on the main graph', () => {
  const ev = analyzeOk(MAIN_ARCHIPELAGO).events;
  it('records tree, parent and already-visited connections', () => {
    const kinds = new Set(ev.flatMap((e) => (e.type === 'INSPECT_EDGE' ? [e.kind] : [])));
    expect([...kinds].sort()).toEqual(['parent', 'tree', 'visited']);
  });
  it('an ancestor that meets an already-discovered descendant records "visited" with no low change', () => {
    const e = ev[57];
    expect(e).toMatchObject({ type: 'INSPECT_EDGE', edge: 'BR05', from: 'ANCHOR', to: 'REEF', kind: 'visited', lowBefore: 0, lowAfter: 0, discoveryOfNeighbour: 4 });
  });
});

describe('describeEvent states the numerical change', () => {
  const ev = analyzeOk(MAIN_ARCHIPELAGO).events;
  it('visited-connection low update shows old -> new', () => {
    const d = describeEvent(ev[37]);
    expect(d.proof[0]).toBe('low[WAVE] = min(8, discovery[SHELL] = 5) = 5');
    expect(d.tone).toBe('update');
  });
  it('return shows min() with both values', () => {
    expect(describeEvent(ev[40]).proof[0]).toBe('low[TIDE] = min(6, low[WAVE] = 5) = 5');
  });
  it('bridge classification states the strict inequality', () => {
    expect(describeEvent(ev[32]).proof[0]).toBe('low[PEARL] = 7 > discovery[TIDE] = 6  → bridge');
    expect(describeEvent(ev[32]).tone).toBe('bridge');
  });
  it('the equal case reads "not a bridge" but the next event reads articulation (>=)', () => {
    expect(describeEvent(ev[44]).proof[0]).toBe('low[TIDE] = 5 ≤ discovery[SHELL] = 5  → not a bridge');
    expect(describeEvent(ev[45]).proof[0]).toBe('low[TIDE] = 5 ≥ discovery[SHELL] = 5  → articulation');
  });
  it('root articulation states the child count', () => {
    expect(describeEvent(ev[58]).proof[0]).toBe('root ANCHOR has 2 DFS-tree children (needs ≥ 2)  → articulation');
  });
  it('every event has a headline and the text is repeatable', () => {
    for (const e of ev) {
      const d = describeEvent(e, { ANCHOR: 'Anchor Cove' });
      expect(d.headline.length).toBeGreaterThan(0);
      expect(describeEvent(e, { ANCHOR: 'Anchor Cove' })).toEqual(d);
    }
  });
});

describe('cross-checks against independent implementations', () => {
  it('main graph: iterative reference and brute-force definition agree with the engine', () => {
    const a = analyzeOk(MAIN_ARCHIPELAGO);
    const ref = iterativeLowLink(MAIN_ARCHIPELAGO);
    const bf = bruteForceCritical(MAIN_ARCHIPELAGO);
    expect(a.table).toEqual(ref.table);
    expect(a.bridges).toEqual(ref.bridges);
    expect(a.articulationPoints).toEqual(ref.articulation);
    expect(a.bridges).toEqual(bf.bridges);
    expect(a.articulationPoints).toEqual(bf.articulation);
    expect(a.componentCount).toBe(bf.components);
  });

  it('500 seeded random graphs (1-12 nodes, 0-20 edges): table, bridges, articulation points, components', () => {
    const rand = rng(12345);
    for (let k = 0; k < 500; k++) {
      const n = 1 + Math.floor(rand() * 12);
      const ids = Array.from({ length: n }, (_, i) => `V${String.fromCharCode(65 + i)}`);
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([ids[i], ids[j]]);
      // shuffle pairs, keep up to 20 (random count, biased toward sparse graphs)
      for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
      }
      const m = Math.min(pairs.length, Math.floor(rand() * 21));
      const g = makeGraph(ids, pairs.slice(0, m).map(([a, b], i) => [`E${i}`, a, b] as [string, string, string]));
      const a = analyzeOk(g);
      const ref = iterativeLowLink(g);
      const bf = bruteForceCritical(g);
      const label = `graph #${k}: ${JSON.stringify(g.edges)}`;
      expect(a.table, label).toEqual(ref.table);
      expect(a.bridges, label).toEqual(bf.bridges);
      expect(a.articulationPoints, label).toEqual(bf.articulation);
      expect(a.componentCount, label).toBe(bf.components);
    }
  });
});
