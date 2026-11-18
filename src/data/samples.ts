import type { Graph } from '../engine/types';
import { MAIN_ARCHIPELAGO } from './archipelago';

/** Five islands in one ring: every bridge lies on a cycle, nothing is critical. */
export const CYCLE_ONLY: Graph = {
  nodes: [
    { id: 'C1', name: 'Ring Island One', x: 50, y: 12 },
    { id: 'C2', name: 'Ring Island Two', x: 86, y: 40 },
    { id: 'C3', name: 'Ring Island Three', x: 72, y: 82 },
    { id: 'C4', name: 'Ring Island Four', x: 28, y: 82 },
    { id: 'C5', name: 'Ring Island Five', x: 14, y: 40 },
  ],
  edges: [
    { id: 'R1', a: 'C1', b: 'C2' },
    { id: 'R2', a: 'C2', b: 'C3' },
    { id: 'R3', a: 'C3', b: 'C4' },
    { id: 'R4', a: 'C4', b: 'C5' },
    { id: 'R5', a: 'C5', b: 'C1' },
  ],
};

/**
 * Root ATOLL (smallest ID) has two tree children (BAY, COVE); DELTA is an
 * isolated island between the components; EBB-FJORD-GULF is a second
 * component (a triangle). Roots are therefore ATOLL, DELTA, EBB.
 */
export const ROOT_TWO_CHILDREN_DISCONNECTED: Graph = {
  nodes: [
    { id: 'GULF', name: 'Gulf Gardens', x: 77, y: 60 },
    { id: 'ATOLL', name: 'Atoll Hub', x: 20, y: 30 },
    { id: 'EBB', name: 'Ebb Isle', x: 64, y: 22 },
    { id: 'DELTA', name: 'Lonely Delta Rock', x: 46, y: 88 },
    { id: 'COVE', name: 'Cove Spit', x: 36, y: 58 },
    { id: 'BAY', name: 'Bay Spit', x: 6, y: 58 },
    { id: 'FJORD', name: 'Fjord Isle', x: 90, y: 22 },
  ],
  edges: [
    { id: 'T3', a: 'GULF', b: 'EBB' },
    { id: 'S2', a: 'COVE', b: 'ATOLL' },
    { id: 'T1', a: 'EBB', b: 'FJORD' },
    { id: 'S1', a: 'ATOLL', b: 'BAY' },
    { id: 'T2', a: 'FJORD', b: 'GULF' },
  ],
};

// ---- deliberately invalid graphs, used to show validation in the UI -------

export const INVALID_DUPLICATE_NODE: Graph = {
  nodes: [
    { id: 'A', name: 'Alpha', x: 20, y: 20 },
    { id: 'A', name: 'Alpha again', x: 60, y: 60 },
  ],
  edges: [],
};

export const INVALID_COORDINATE: Graph = {
  nodes: [
    { id: 'A', name: 'Alpha', x: 20, y: 20 },
    { id: 'B', name: 'Beta', x: 140, y: 60 },
  ],
  edges: [{ id: 'E1', a: 'A', b: 'B' }],
};

export const INVALID_UNKNOWN_ENDPOINT: Graph = {
  nodes: [{ id: 'A', name: 'Alpha', x: 20, y: 20 }],
  edges: [{ id: 'E1', a: 'A', b: 'GHOST' }],
};

export const INVALID_SELF_LOOP: Graph = {
  nodes: [{ id: 'A', name: 'Alpha', x: 20, y: 20 }],
  edges: [{ id: 'E1', a: 'A', b: 'A' }],
};

export const INVALID_DUPLICATE_CONNECTION: Graph = {
  nodes: [
    { id: 'A', name: 'Alpha', x: 20, y: 20 },
    { id: 'B', name: 'Beta', x: 60, y: 60 },
  ],
  edges: [
    { id: 'E1', a: 'A', b: 'B' },
    { id: 'E2', a: 'B', b: 'A' },
  ],
};

export interface SampleOption {
  key: string;
  label: string;
  graph: Graph;
}

export const SAMPLE_OPTIONS: SampleOption[] = [
  { key: 'main', label: 'My Archipelago: Tidewater Isles (main demo)', graph: MAIN_ARCHIPELAGO },
  { key: 'cycle', label: 'Test: ring of islands (cycle only)', graph: CYCLE_ONLY },
  { key: 'combo', label: 'Test: root with 2 children + 2nd component + isolated island', graph: ROOT_TWO_CHILDREN_DISCONNECTED },
  { key: 'bad-dup-node', label: 'Invalid: duplicate island ID', graph: INVALID_DUPLICATE_NODE },
  { key: 'bad-coord', label: 'Invalid: coordinate out of range', graph: INVALID_COORDINATE },
  { key: 'bad-endpoint', label: 'Invalid: unknown bridge endpoint', graph: INVALID_UNKNOWN_ENDPOINT },
  { key: 'bad-loop', label: 'Invalid: self-loop', graph: INVALID_SELF_LOOP },
  { key: 'bad-dup-edge', label: 'Invalid: duplicate connection', graph: INVALID_DUPLICATE_CONNECTION },
];
