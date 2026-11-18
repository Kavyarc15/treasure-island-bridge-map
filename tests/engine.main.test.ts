import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { analyzeGraph, buildAdjacency, replayStateAt } from '../src/engine';
import type { Graph, ReplayEvent } from '../src/engine';
import { analyzeOk, rng, shuffled } from './helpers';
import {
  ORACLE_ADJACENCY, ORACLE_ARTICULATION, ORACLE_BRIDGES, ORACLE_COMPONENT_COUNT,
  ORACLE_DISCOVERY_ORDER, ORACLE_EVENT_COUNT, ORACLE_TABLE,
} from './oracle';

describe('main archipelago reproduces the independently documented oracle', () => {
  const a = analyzeOk(MAIN_ARCHIPELAGO);

  it('meets the size and shape rules of the main demonstration', () => {
    expect(MAIN_ARCHIPELAGO.nodes.length).toBeGreaterThanOrEqual(6);
    expect(MAIN_ARCHIPELAGO.nodes.length).toBeLessThanOrEqual(9);
    expect(MAIN_ARCHIPELAGO.edges.length).toBeGreaterThanOrEqual(6);
    expect(MAIN_ARCHIPELAGO.edges.length).toBeLessThanOrEqual(13);
    expect(a.componentCount).toBe(1); // connected
    expect(a.bridges.length).toBeGreaterThanOrEqual(1);
    // a non-root articulation point exists
    const rootIds = a.table.filter((r) => r.parent === null).map((r) => r.id);
    expect(a.articulationPoints.some((id) => !rootIds.includes(id))).toBe(true);
    // a non-bridge edge inside a cycle exists: n-1 tree edges, anything beyond is a cycle edge
    expect(MAIN_ARCHIPELAGO.edges.length).toBeGreaterThan(MAIN_ARCHIPELAGO.nodes.length - 1);
    expect(MAIN_ARCHIPELAGO.edges.length - a.bridges.length).toBeGreaterThanOrEqual(3);
  });

  it('sorted adjacency lists', () => {
    const adj = buildAdjacency(MAIN_ARCHIPELAGO);
    const got = Object.fromEntries(
      Object.entries(adj).map(([id, list]) => [id, list.map((x) => [x.neighbour, x.edgeId])]),
    );
    expect(got).toEqual(ORACLE_ADJACENCY);
  });

  it('discovery order', () => expect(a.discoveryOrder).toEqual(ORACLE_DISCOVERY_ORDER));

  it('parent / discovery / low table', () => {
    const got = Object.fromEntries(a.table.map((r) => [r.id, [r.parent, r.discovery, r.low]]));
    expect(got).toEqual(ORACLE_TABLE);
  });

  it('component count, bridge IDs, articulation IDs', () => {
    expect(a.componentCount).toBe(ORACLE_COMPONENT_COUNT);
    expect(a.bridges).toEqual(ORACLE_BRIDGES);
    expect(a.articulationPoints).toEqual(ORACLE_ARTICULATION);
  });

  it('has the documented number of events', () => expect(a.events.length).toBe(ORACLE_EVENT_COUNT));

  it('matches the hand-traced events at key positions (docs/oracle.md trace)', () => {
    const e = a.events;
    expect(e[0]).toMatchObject({ type: 'COMPONENT_START', root: 'ANCHOR', componentNo: 1 });
    expect(e[1]).toMatchObject({ type: 'DISCOVER', node: 'ANCHOR', parent: null, discovery: 0, low: 0 });
    expect(e[20]).toMatchObject({ type: 'INSPECT_EDGE', edge: 'BR05', from: 'REEF', to: 'ANCHOR', kind: 'visited', lowBefore: 4, lowAfter: 0 });
    expect(e[37]).toMatchObject({ type: 'INSPECT_EDGE', edge: 'BR09', from: 'WAVE', to: 'SHELL', kind: 'visited', lowBefore: 8, lowAfter: 5 });
    expect(e[40]).toMatchObject({ type: 'RETURN_FROM_CHILD', node: 'TIDE', child: 'WAVE', lowBefore: 6, lowAfter: 5 });
    expect(e[44]).toMatchObject({ type: 'CLASSIFY_EDGE', edge: 'BR07', lowChild: 5, discoveryParent: 5, isBridge: false });
    expect(e[45]).toMatchObject({ type: 'ARTICULATION', node: 'SHELL', reason: 'non-root', child: 'TIDE' });
    expect(e[58]).toMatchObject({ type: 'ARTICULATION', node: 'ANCHOR', reason: 'root-two-children', childCount: 2 });
    expect(e[60]).toMatchObject({ type: 'COMPONENT_COMPLETE', root: 'ANCHOR', nodeCount: 9 });
    expect(e[61]).toMatchObject({ type: 'FINISH', componentCount: 1, bridges: ORACLE_BRIDGES, articulationPoints: ORACLE_ARTICULATION });
  });

  it('event type counts', () => {
    const counts: Record<string, number> = {};
    for (const ev of a.events) counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    expect(counts).toEqual({
      COMPONENT_START: 1, DISCOVER: 9, INSPECT_EDGE: 20, RETURN_FROM_CHILD: 8,
      CLASSIFY_EDGE: 8, ARTICULATION: 5, NODE_COMPLETE: 9, COMPONENT_COMPLETE: 1, FINISH: 1,
    });
  });
});

describe('the application never reads the oracle', () => {
  it('no source file under src/ imports from tests/ or mentions the oracle module', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|css|html)$/.test(name)) files.push(p);
      }
    };
    walk(join(__dirname, '..', 'src'));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const importLines = readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => /^\s*(import|export)\b.*\bfrom\b/.test(l) || /\brequire\(|\bfetch\(|readFile/.test(l));
      for (const line of importLines) {
        expect(line, `${f}: ${line}`).not.toMatch(/oracle|\/tests\//i);
      }
    }
  });
});

describe('input order and map position never change the result', () => {
  const base = analyzeOk(MAIN_ARCHIPELAGO);

  it('reversed node and edge arrays', () => {
    const g: Graph = {
      nodes: [...MAIN_ARCHIPELAGO.nodes].reverse(),
      edges: [...MAIN_ARCHIPELAGO.edges].reverse(),
    };
    expect(analyzeOk(g)).toEqual(base);
  });

  it('many seeded shuffles, with swapped edge endpoints and different coordinates', () => {
    const rand = rng(2026);
    for (let k = 0; k < 50; k++) {
      const g: Graph = {
        nodes: shuffled(MAIN_ARCHIPELAGO.nodes, rand).map((n) => ({
          ...n, x: Math.floor(rand() * 101), y: Math.floor(rand() * 101),
        })),
        edges: shuffled(MAIN_ARCHIPELAGO.edges, rand).map((e) =>
          rand() < 0.5 ? { ...e } : { id: e.id, a: e.b, b: e.a },
        ),
      };
      const got = analyzeOk(g);
      expect(got.table).toEqual(base.table);
      expect(got.discoveryOrder).toEqual(base.discoveryOrder);
      expect(got.bridges).toEqual(base.bridges);
      expect(got.articulationPoints).toEqual(base.articulationPoints);
      expect(got.componentCount).toBe(base.componentCount);
      expect(got.events).toEqual(base.events); // even the replay is identical
    }
  });
});

describe('analysis does not mutate its input and is repeatable', () => {
  it('frozen input works and two runs are identical', () => {
    const frozen: Graph = JSON.parse(JSON.stringify(MAIN_ARCHIPELAGO));
    frozen.nodes.forEach(Object.freeze);
    frozen.edges.forEach(Object.freeze);
    Object.freeze(frozen.nodes);
    Object.freeze(frozen.edges);
    Object.freeze(frozen);
    const before = JSON.stringify(frozen);
    const r1 = analyzeGraph(frozen);
    const r2 = analyzeGraph(frozen);
    expect(JSON.stringify(frozen)).toBe(before);
    expect(r1).toEqual(r2);
  });
});

describe('every visible low update and classification agrees with the final result', () => {
  const a = analyzeOk(MAIN_ARCHIPELAGO);
  const lastLow = new Map<string, number>();
  const lowHistory = new Map<string, number[]>();
  for (const ev of a.events as ReplayEvent[]) {
    let node: string | null = null;
    let value = 0;
    if (ev.type === 'DISCOVER') { node = ev.node; value = ev.low; }
    else if (ev.type === 'INSPECT_EDGE') { node = ev.from; value = ev.lowAfter; }
    else if (ev.type === 'RETURN_FROM_CHILD') { node = ev.node; value = ev.lowAfter; }
    if (node !== null) {
      lastLow.set(node, value);
      lowHistory.set(node, [...(lowHistory.get(node) ?? []), value]);
    }
  }

  it('the last low shown for each node is its final table low', () => {
    for (const row of a.table) expect(lastLow.get(row.id), row.id).toBe(row.low);
  });

  it('low never increases for a node', () => {
    for (const [id, history] of lowHistory) {
      for (let i = 1; i < history.length; i++) expect(history[i], id).toBeLessThanOrEqual(history[i - 1]);
    }
  });

  it('CLASSIFY_EDGE and ARTICULATION events agree with the final lists', () => {
    const bridgesFromEvents = a.events.flatMap((e) => (e.type === 'CLASSIFY_EDGE' && e.isBridge ? [e.edge] : []));
    const artFromEvents = a.events.flatMap((e) => (e.type === 'ARTICULATION' ? [e.node] : []));
    expect([...bridgesFromEvents].sort()).toEqual(a.bridges);
    expect([...artFromEvents].sort()).toEqual(a.articulationPoints);
    expect(new Set(artFromEvents).size).toBe(artFromEvents.length); // flagged once each
  });

  it('folding all events reproduces the table, component count and summaries', () => {
    const s = replayStateAt(MAIN_ARCHIPELAGO, a.events, a.events.length);
    for (const row of a.table) {
      expect(s.nodes[row.id]).toMatchObject({ parent: row.parent, discovery: row.discovery, low: row.low });
    }
    expect(s.componentsStarted).toBe(a.componentCount);
    expect(s.bridges).toEqual(a.bridges);
    expect(s.articulationPoints).toEqual(a.articulationPoints);
    expect(s.discoveryOrder).toEqual(a.discoveryOrder);
    expect(s.finished).toBe(true);
  });

  it('pre-traversal state shows nothing discovered', () => {
    const s = replayStateAt(MAIN_ARCHIPELAGO, a.events, 0);
    expect(s.currentEvent).toBeNull();
    expect(Object.values(s.nodes).every((n) => n.status === 'unvisited' && n.discovery === null)).toBe(true);
    expect(Object.values(s.edges).every((e) => e === 'unvisited')).toBe(true);
    expect(s.bridges).toEqual([]);
    expect(s.articulationPoints).toEqual([]);
    expect(s.componentsStarted).toBe(0);
  });
});
