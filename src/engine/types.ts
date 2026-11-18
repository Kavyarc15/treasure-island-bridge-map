// Shared types for the calculation engine. No UI imports anywhere in src/engine.

export interface IslandNode {
  id: string;
  name: string;
  /** 0..100, presentation only */
  x: number;
  /** 0..100, presentation only */
  y: number;
}

/** Undirected bridge between islands `a` and `b`. */
export interface BridgeEdge {
  id: string;
  a: string;
  b: string;
}

export interface Graph {
  nodes: IslandNode[];
  edges: BridgeEdge[];
}

export type ValidationCode =
  | 'INVALID_STRUCTURE'
  | 'NODE_COUNT_OUT_OF_RANGE'
  | 'EDGE_COUNT_OUT_OF_RANGE'
  | 'BAD_NODE_ID'
  | 'DUPLICATE_NODE_ID'
  | 'EMPTY_NODE_NAME'
  | 'NON_FINITE_COORDINATE'
  | 'COORDINATE_OUT_OF_RANGE'
  | 'BAD_EDGE_ID'
  | 'DUPLICATE_EDGE_ID'
  | 'UNKNOWN_ENDPOINT'
  | 'SELF_LOOP'
  | 'DUPLICATE_CONNECTION';

export interface ValidationError {
  code: ValidationCode;
  /** Human-readable message that names the offending item. */
  message: string;
  nodeId?: string;
  edgeId?: string;
  endpointId?: string;
}

export type ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] };

export interface AdjacencyEntry {
  neighbour: string;
  edgeId: string;
}

/** node id -> neighbours sorted ascending by neighbour id (ASCII). */
export type Adjacency = Record<string, AdjacencyEntry[]>;

// ---------------------------------------------------------------- events

export type InspectKind = 'tree' | 'parent' | 'visited';

export interface ComponentStartEvent {
  type: 'COMPONENT_START';
  root: string;
  componentNo: number;
}

export interface DiscoverEvent {
  type: 'DISCOVER';
  node: string;
  parent: string | null;
  discovery: number;
  low: number;
}

export interface InspectEdgeEvent {
  type: 'INSPECT_EDGE';
  edge: string;
  from: string;
  to: string;
  kind: InspectKind;
  lowBefore: number;
  lowAfter: number;
  /** discovery[to] when kind === 'visited', otherwise null */
  discoveryOfNeighbour: number | null;
}

export interface ReturnFromChildEvent {
  type: 'RETURN_FROM_CHILD';
  node: string;
  child: string;
  edge: string;
  lowBefore: number;
  lowAfter: number;
  lowChild: number;
}

export interface ClassifyEdgeEvent {
  type: 'CLASSIFY_EDGE';
  edge: string;
  parent: string;
  child: string;
  lowChild: number;
  discoveryParent: number;
  isBridge: boolean;
}

export interface ArticulationEvent {
  type: 'ARTICULATION';
  node: string;
  reason: 'non-root' | 'root-two-children';
  /** non-root only */
  child: string | null;
  lowChild: number | null;
  discoveryNode: number;
  /** root only: number of DFS-tree children */
  childCount: number | null;
}

export interface NodeCompleteEvent {
  type: 'NODE_COMPLETE';
  node: string;
}

export interface ComponentCompleteEvent {
  type: 'COMPONENT_COMPLETE';
  root: string;
  componentNo: number;
  nodeCount: number;
}

export interface FinishEvent {
  type: 'FINISH';
  componentCount: number;
  bridges: string[];
  articulationPoints: string[];
}

export type ReplayEvent = (
  | ComponentStartEvent
  | DiscoverEvent
  | InspectEdgeEvent
  | ReturnFromChildEvent
  | ClassifyEdgeEvent
  | ArticulationEvent
  | NodeCompleteEvent
  | ComponentCompleteEvent
  | FinishEvent
) & { index: number };

// -------------------------------------------------------------- analysis

export interface NodeRow {
  id: string;
  parent: string | null;
  discovery: number;
  low: number;
}

export interface Analysis {
  adjacency: Adjacency;
  events: ReplayEvent[];
  discoveryOrder: string[];
  /** rows sorted by node id (ASCII) */
  table: NodeRow[];
  componentCount: number;
  /** sorted ascending ASCII */
  bridges: string[];
  /** sorted ascending ASCII */
  articulationPoints: string[];
}

export type AnalysisOutcome =
  | { ok: true; analysis: Analysis }
  | { ok: false; errors: ValidationError[] };
