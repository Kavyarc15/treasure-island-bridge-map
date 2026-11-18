import { describe, expect, it } from 'vitest';
import { CYCLE_ONLY, ROOT_TWO_CHILDREN_DISCONNECTED } from '../src/data/samples';
import { compareIds, sortedIds } from '../src/engine';
import { analyzeOk, makeGraph } from './helpers';

const row = (a: ReturnType<typeof analyzeOk>, id: string) => a.table.find((r) => r.id === id)!;

describe('back-connection low propagation', () => {
  // A-B, B-C, C-D, D-B : D sees visited B (not its parent) -> low drops and flows up to C.
  const g = makeGraph(['A', 'B', 'C', 'D'], [
    ['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'D'], ['E4', 'D', 'B'],
  ]);
  const a = analyzeOk(g);

  it('a back edge lowers low of the node that sees it', () => {
    expect(row(a, 'D')).toMatchObject({ discovery: 3, low: 1 }); // disc[B] = 1
  });
  it('the lowered value propagates up through tree edges', () => {
    expect(row(a, 'C')).toMatchObject({ discovery: 2, low: 1 });
    expect(row(a, 'B')).toMatchObject({ discovery: 1, low: 1 });
  });
  it('a loop to the root travels all the way up a ring of four', () => {
    const ring = analyzeOk(makeGraph(['A', 'B', 'C', 'D'], [
      ['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'D'], ['E4', 'D', 'A'],
    ]));
    expect(ring.table.map((r) => r.low)).toEqual([0, 0, 0, 0]);
  });
  it('a back connection uses discovery[neighbour], NOT low[neighbour]', () => {
    // N1 already has low 0 (its child N2 loops to N0) but discovery 1.
    // Later N4 meets N1 through a non-parent edge: low[N4] must be discovery[N1] = 1, not low[N1] = 0.
    const g = makeGraph(['N0', 'N1', 'N2', 'N3', 'N4'], [
      ['E1', 'N0', 'N1'], ['E2', 'N1', 'N2'], ['E3', 'N2', 'N0'],
      ['E4', 'N1', 'N3'], ['E5', 'N3', 'N4'], ['E6', 'N4', 'N1'],
    ]);
    const r = analyzeOk(g);
    expect(row(r, 'N1')).toMatchObject({ discovery: 1, low: 0 });
    expect(row(r, 'N4')).toMatchObject({ discovery: 4, low: 1 });
    expect(row(r, 'N3')).toMatchObject({ discovery: 3, low: 1 });
    expect(r.bridges).toEqual([]); // two loops hang off N1; nothing is a bridge
    expect(r.articulationPoints).toEqual(['N1']); // N1 separates the second loop from N0/N2
  });
  it('the parent edge itself is not a back connection', () => {
    // path A-B: B only sees its parent, so low[B] must stay at discovery[B]
    const p = analyzeOk(makeGraph(['A', 'B'], [['E1', 'A', 'B']]));
    expect(row(p, 'B')).toMatchObject({ discovery: 1, low: 1 });
  });
});

describe('strict bridge inequality: bridge iff low[child] > discovery[parent]', () => {
  it('equal values are NOT a bridge (edge on a cycle back to the parent)', () => {
    const ring = analyzeOk(makeGraph(['A', 'B', 'C'], [['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'A']]));
    // tree edge A-B: low[B] = 0 = discovery[A]; 0 > 0 is false
    expect(row(ring, 'B').low).toBe(row(ring, 'A').discovery);
    expect(ring.bridges).toEqual([]);
  });
  it('equality on a deeper tree edge: low[TIDE]=5 == discovery[SHELL]=5 is not a bridge', () => {
    // A-B, B-C, C-D, D-B : tree edge B-C has low[C] = 1 = discovery[B]
    const a = analyzeOk(makeGraph(['A', 'B', 'C', 'D'], [
      ['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'D'], ['E4', 'D', 'B'],
    ]));
    expect(row(a, 'C').low).toBe(row(a, 'B').discovery);
    expect(a.bridges).toEqual(['E1']); // only the pendant link, never B-C / C-D / D-B
  });
  it('greater is a bridge (low[child] = discovery[child] > discovery[parent])', () => {
    const p = analyzeOk(makeGraph(['A', 'B'], [['E1', 'A', 'B']]));
    expect(p.bridges).toEqual(['E1']);
  });
});

describe('non-root articulation rule uses >= (not >)', () => {
  const g = makeGraph(['A', 'B', 'C', 'D'], [
    ['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'D'], ['E4', 'D', 'B'],
  ]);
  const a = analyzeOk(g);
  it('B is an articulation point although its child edge B-C is not a bridge (low[C] == discovery[B])', () => {
    expect(row(a, 'C').low).toBe(row(a, 'B').discovery);
    expect(a.bridges).not.toContain('E2');
    expect(a.articulationPoints).toContain('B');
  });
  it('a node whose children all loop above it is NOT an articulation point', () => {
    // ring A-B-C-A: B has child C with low 0 < discovery[B] = 1
    const ring = analyzeOk(makeGraph(['A', 'B', 'C'], [['E1', 'A', 'B'], ['E2', 'B', 'C'], ['E3', 'C', 'A']]));
    expect(ring.articulationPoints).toEqual([]);
  });
  it('leaf nodes are never articulation points', () => {
    expect(a.articulationPoints).not.toContain('D');
  });
});

describe('root child-count rule', () => {
  it('a root with ONE tree child is not an articulation point (even though low[child] >= discovery[root])', () => {
    const p = analyzeOk(makeGraph(['A', 'B', 'C'], [['E1', 'A', 'B'], ['E2', 'B', 'C']]));
    expect(p.table.find((r) => r.id === 'A')!.parent).toBeNull();
    expect(p.articulationPoints).toEqual(['B']); // not A
  });
  it('a root with TWO tree children is an articulation point', () => {
    const s = analyzeOk(makeGraph(['A', 'B', 'C'], [['E1', 'A', 'B'], ['E2', 'A', 'C']]));
    expect(s.articulationPoints).toEqual(['A']);
    const ev = s.events.find((e) => e.type === 'ARTICULATION');
    expect(ev).toMatchObject({ reason: 'root-two-children', childCount: 2 });
  });
  it('a root of a ring has one tree child (the second neighbour is a back connection)', () => {
    const ring = analyzeOk(CYCLE_ONLY);
    expect(ring.articulationPoints).toEqual([]);
  });
});

describe('cycle-only graph', () => {
  const a = analyzeOk(CYCLE_ONLY);
  it('has no critical bridge and no articulation point', () => {
    expect(a.bridges).toEqual([]);
    expect(a.articulationPoints).toEqual([]);
    expect(a.componentCount).toBe(1);
  });
  it('every island can reach the root, so every low is 0', () => {
    expect(a.table.every((r) => r.low === 0)).toBe(true);
  });
});

describe('root with two children + disconnected component + isolated node', () => {
  const a = analyzeOk(ROOT_TWO_CHILDREN_DISCONNECTED);
  it('three components; roots are chosen in ascending ID order', () => {
    expect(a.componentCount).toBe(3);
    const roots = a.events.flatMap((e) => (e.type === 'COMPONENT_START' ? [e.root] : []));
    expect(roots).toEqual(['ATOLL', 'DELTA', 'EBB']);
    expect(a.table.filter((r) => r.parent === null).map((r) => r.id)).toEqual(['ATOLL', 'DELTA', 'EBB']);
  });
  it('one discovery clock is shared across components', () => {
    expect(a.discoveryOrder).toEqual(['ATOLL', 'BAY', 'COVE', 'DELTA', 'EBB', 'FJORD', 'GULF']);
    expect(a.table.map((r) => [r.id, r.discovery])).toEqual([
      ['ATOLL', 0], ['BAY', 1], ['COVE', 2], ['DELTA', 3], ['EBB', 4], ['FJORD', 5], ['GULF', 6],
    ]);
  });
  it('the root with two tree children is an articulation point; both spits are bridges', () => {
    expect(a.articulationPoints).toEqual(['ATOLL']);
    expect(a.bridges).toEqual(['S1', 'S2']);
  });
  it('the isolated island is its own component with parent null and low == discovery', () => {
    expect(row(a, 'DELTA')).toEqual({ id: 'DELTA', parent: null, discovery: 3, low: 3 });
    const done = a.events.find((e) => e.type === 'COMPONENT_COMPLETE' && e.root === 'DELTA');
    expect(done).toMatchObject({ nodeCount: 1, componentNo: 2 });
  });
  it('the triangle component has no critical items', () => {
    expect(a.bridges.some((b) => b.startsWith('T'))).toBe(false);
    expect(a.articulationPoints.some((n) => ['EBB', 'FJORD', 'GULF'].includes(n))).toBe(false);
  });
});

describe('ASCII ordering (never locale or natural sort)', () => {
  it('compareIds / sortedIds use code-unit order: - < digits < letters < _', () => {
    expect(sortedIds(['A_', 'AA', 'A2', 'A10', 'A0', 'A-'])).toEqual(['A-', 'A0', 'A10', 'A2', 'AA', 'A_']);
    expect(compareIds('A10', 'A2')).toBeLessThan(0); // natural sort would say the opposite
    expect(compareIds('B', 'B')).toBe(0);
  });
  it('roots and neighbours are visited in ASCII order regardless of source order', () => {
    // star: centre N0 connected to N10 and N2. ASCII: N0 < N10 < N2.
    const g = makeGraph(['N2', 'N10', 'N0'], [['E1', 'N0', 'N2'], ['E2', 'N0', 'N10']]);
    const a = analyzeOk(g);
    expect(a.discoveryOrder).toEqual(['N0', 'N10', 'N2']);
  });
});

describe('component / root ordering when IDs are listed in reverse', () => {
  it('starts at the smallest unvisited ID each time', () => {
    const g = makeGraph(['Z2', 'Z1', 'M2', 'M1', 'A'], [['E1', 'Z1', 'Z2'], ['E2', 'M1', 'M2']]);
    const a = analyzeOk(g);
    const roots = a.events.flatMap((e) => (e.type === 'COMPONENT_START' ? [e.root] : []));
    expect(roots).toEqual(['A', 'M1', 'Z1']);
    expect(a.componentCount).toBe(3);
  });
});

describe('smallest legal graphs', () => {
  it('one node, zero edges is valid: one component, nothing critical', () => {
    const a = analyzeOk(makeGraph(['SOLO'], []));
    expect(a.componentCount).toBe(1);
    expect(a.table).toEqual([{ id: 'SOLO', parent: null, discovery: 0, low: 0 }]);
    expect(a.events.map((e) => e.type)).toEqual([
      'COMPONENT_START', 'DISCOVER', 'NODE_COMPLETE', 'COMPONENT_COMPLETE', 'FINISH',
    ]);
  });
  it('twelve nodes and twenty edges are valid', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `N${String.fromCharCode(65 + i)}`);
    const specs: Array<[string, string, string]> = [];
    for (let i = 0; i < 12 && specs.length < 20; i++) {
      for (let j = i + 1; j < 12 && specs.length < 20; j++) {
        if (j === i + 1 || j === i + 2) specs.push([`E${specs.length}`, ids[i], ids[j]]);
      }
    }
    expect(specs.length).toBe(20);
    expect(analyzeOk(makeGraph(ids, specs)).componentCount).toBe(1);
  });
});
