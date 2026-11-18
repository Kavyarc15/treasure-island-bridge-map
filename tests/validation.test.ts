import { describe, expect, it } from 'vitest';
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { Controller } from '../src/app/controller';
import {
  INVALID_COORDINATE, INVALID_DUPLICATE_CONNECTION, INVALID_DUPLICATE_NODE,
  INVALID_SELF_LOOP, INVALID_UNKNOWN_ENDPOINT,
} from '../src/data/samples';
import { analyzeGraph, validateGraph } from '../src/engine';
import type { ValidationCode } from '../src/engine';
import { makeGraph } from './helpers';

const node = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `Isle ${id}`, x: 10, y: 10, ...over });
const g = (nodes: unknown[], edges: unknown[] = []) => ({ nodes, edges });

interface Case {
  name: string;
  input: unknown;
  code: ValidationCode;
  nodeId?: string;
  edgeId?: string;
  endpointId?: string;
  /** substring the human message must contain (names the offender) */
  mentions: string;
}

const cases: Case[] = [
  { name: 'duplicate node ID', input: INVALID_DUPLICATE_NODE, code: 'DUPLICATE_NODE_ID', nodeId: 'A', mentions: '"A"' },
  { name: 'coordinate out of range (x = 140)', input: INVALID_COORDINATE, code: 'COORDINATE_OUT_OF_RANGE', nodeId: 'B', mentions: '"B"' },
  { name: 'unknown endpoint', input: INVALID_UNKNOWN_ENDPOINT, code: 'UNKNOWN_ENDPOINT', edgeId: 'E1', endpointId: 'GHOST', mentions: 'GHOST' },
  { name: 'self-loop', input: INVALID_SELF_LOOP, code: 'SELF_LOOP', edgeId: 'E1', endpointId: 'A', mentions: '"E1"' },
  { name: 'duplicate connection (same pair, reversed)', input: INVALID_DUPLICATE_CONNECTION, code: 'DUPLICATE_CONNECTION', edgeId: 'E2', mentions: '"E1"' },
  { name: 'coordinate below range (y = -1)', input: g([node('A', { y: -1 })]), code: 'COORDINATE_OUT_OF_RANGE', nodeId: 'A', mentions: 'y=-1' },
  { name: 'coordinate above range (x = 101)', input: g([node('A', { x: 101 })]), code: 'COORDINATE_OUT_OF_RANGE', nodeId: 'A', mentions: 'x=101' },
  { name: 'NaN coordinate', input: g([node('A', { x: NaN })]), code: 'NON_FINITE_COORDINATE', nodeId: 'A', mentions: 'NaN' },
  { name: 'Infinity coordinate', input: g([node('A', { y: Infinity })]), code: 'NON_FINITE_COORDINATE', nodeId: 'A', mentions: 'Infinity' },
  { name: 'coordinate that is not a number', input: g([node('A', { x: '50' })]), code: 'NON_FINITE_COORDINATE', nodeId: 'A', mentions: '"A"' },
  { name: 'lowercase node ID', input: g([node('a')]), code: 'BAD_NODE_ID', nodeId: 'a', mentions: '"a"' },
  { name: 'node ID longer than 16 chars', input: g([node('A' + 'B'.repeat(16))]), code: 'BAD_NODE_ID', nodeId: 'A' + 'B'.repeat(16), mentions: 'ID must match' },
  { name: 'node ID starting with a digit', input: g([node('1A')]), code: 'BAD_NODE_ID', nodeId: '1A', mentions: '"1A"' },
  { name: 'empty node name', input: g([node('A', { name: '' })]), code: 'EMPTY_NODE_NAME', nodeId: 'A', mentions: '"A"' },
  { name: 'whitespace-only node name', input: g([node('A', { name: '   ' })]), code: 'EMPTY_NODE_NAME', nodeId: 'A', mentions: 'non-empty' },
  { name: 'zero nodes', input: g([]), code: 'NODE_COUNT_OUT_OF_RANGE', mentions: '0 nodes' },
  { name: 'thirteen nodes', input: g(Array.from({ length: 13 }, (_, i) => node(`N${String.fromCharCode(65 + i)}`))), code: 'NODE_COUNT_OUT_OF_RANGE', mentions: '13 nodes' },
  { name: 'twenty-one edges', input: (() => {
      const ids = Array.from({ length: 12 }, (_, i) => `N${String.fromCharCode(65 + i)}`);
      const edges: Array<{ id: string; a: string; b: string }> = [];
      for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12 && edges.length < 21; j++) edges.push({ id: `E${edges.length}`, a: ids[i], b: ids[j] });
      return g(ids.map((id) => node(id)), edges);
    })(), code: 'EDGE_COUNT_OUT_OF_RANGE', mentions: '21 edges' },
  { name: 'bad edge ID', input: g([node('A'), node('B')], [{ id: 'e 1', a: 'A', b: 'B' }]), code: 'BAD_EDGE_ID', edgeId: 'e 1', mentions: '"e 1"' },
  { name: 'duplicate edge ID', input: g([node('A'), node('B'), node('C')], [{ id: 'E1', a: 'A', b: 'B' }, { id: 'E1', a: 'B', b: 'C' }]), code: 'DUPLICATE_EDGE_ID', edgeId: 'E1', mentions: 'duplicate edge ID' },
  { name: 'unknown first endpoint', input: g([node('A')], [{ id: 'E1', a: 'NOPE', b: 'A' }]), code: 'UNKNOWN_ENDPOINT', edgeId: 'E1', endpointId: 'NOPE', mentions: 'NOPE' },
  { name: 'duplicate connection (same direction)', input: g([node('A'), node('B')], [{ id: 'E1', a: 'A', b: 'B' }, { id: 'E2', a: 'A', b: 'B' }]), code: 'DUPLICATE_CONNECTION', edgeId: 'E2', mentions: '"E1"' },
  { name: 'not an object', input: 42, code: 'INVALID_STRUCTURE', mentions: 'nodes' },
  { name: 'missing edges array', input: { nodes: [node('A')] }, code: 'INVALID_STRUCTURE', mentions: 'edges' },
  { name: 'null', input: null, code: 'INVALID_STRUCTURE', mentions: 'nodes' },
];

describe('validation identifies the offending node, edge or endpoint', () => {
  it.each(cases)('$name', (c) => {
    const result = validateGraph(c.input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.errors.find((e) => e.code === c.code);
    expect(err, JSON.stringify(result.errors)).toBeDefined();
    expect(err!.message).toContain(c.mentions);
    if (c.nodeId !== undefined) expect(err!.nodeId).toBe(c.nodeId);
    if (c.edgeId !== undefined) expect(err!.edgeId).toBe(c.edgeId);
    if (c.endpointId !== undefined) expect(err!.endpointId).toBe(c.endpointId);
  });

  it('never throws on garbage', () => {
    for (const bad of [undefined, 'x', [], {}, { nodes: 1, edges: 2 }, { nodes: [null], edges: [null] }, g([node('A')], [{ id: 'E1' }])]) {
      expect(() => validateGraph(bad)).not.toThrow();
      expect(validateGraph(bad).ok).toBe(false);
    }
  });

  it('reports all problems, nodes first then edges', () => {
    const r = validateGraph(g([node('a'), node('B', { x: 500 })], [{ id: 'E1', a: 'B', b: 'B' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toEqual(['BAD_NODE_ID', 'COORDINATE_OUT_OF_RANGE', 'SELF_LOOP']);
  });

  it('valid boundary values pass: coordinates 0 and 100, 16-char IDs, - and _ in IDs', () => {
    const r = validateGraph(g(
      [node('A-B_C', { x: 0, y: 100 }), node('A' + 'Z'.repeat(15), { x: 100, y: 0 })],
      [{ id: 'E-1_X', a: 'A-B_C', b: 'A' + 'Z'.repeat(15) }],
    ));
    expect(r.ok).toBe(true);
  });

  it('a valid graph passes', () => expect(validateGraph(MAIN_ARCHIPELAGO).ok).toBe(true));
});

describe('invalid input produces no partial analysis', () => {
  it.each(cases)('analyzeGraph returns errors only: $name', (c) => {
    const outcome = analyzeGraph(c.input);
    expect(outcome.ok).toBe(false);
    expect(Object.keys(outcome)).toEqual(['ok', 'errors']); // no events, table or results at all
  });
});

describe('invalid input clears stale replay and results (no retained output)', () => {
  const invalidInputs: Array<[string, unknown]> = [
    ['out-of-range coordinate', INVALID_COORDINATE],
    ['duplicate node ID', INVALID_DUPLICATE_NODE],
    ['unknown endpoint', INVALID_UNKNOWN_ENDPOINT],
    ['self-loop', INVALID_SELF_LOOP],
    ['duplicate connection', INVALID_DUPLICATE_CONNECTION],
  ];

  it.each(invalidInputs)('after a half-finished valid run, loading %s wipes everything', (_name, bad) => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    for (let i = 0; i < 25; i++) c.step();
    expect(c.snapshot().index).toBe(25);

    const s = c.load(bad);
    expect(s.errors.length).toBeGreaterThan(0);
    expect(s.analysis).toBeNull();
    expect(s.graph).toBeNull();
    expect(s.view).toBeNull(); // no map state, table, component count or summaries
    expect(s.index).toBe(0);
    expect(s.total).toBe(0);
    // controls do nothing and cannot resurrect old results
    expect(c.step().view).toBeNull();
    expect(c.runToEnd().view).toBeNull();
    expect(c.reset().view).toBeNull();
    expect(c.snapshot().errors.length).toBeGreaterThan(0);
  });

  it('a valid load after an invalid one starts clean and clears the errors', () => {
    const c = new Controller();
    c.load(INVALID_COORDINATE);
    const s = c.load(makeGraph(['A', 'B'], [['E1', 'A', 'B']]));
    expect(s.errors).toEqual([]);
    expect(s.index).toBe(0);
    expect(s.view!.currentEvent).toBeNull();
  });
});
