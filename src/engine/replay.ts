import { sortedIds } from './order';
import type { Graph, ReplayEvent } from './types';

export type NodeStatus = 'unvisited' | 'active' | 'done';
export type EdgeStatus = 'unvisited' | 'tree' | 'non-tree' | 'bridge';

export interface NodeView {
  id: string;
  status: NodeStatus;
  /** undefined until the node is discovered; null for a component root */
  parent: string | null | undefined;
  discovery: number | null;
  low: number | null;
  articulation: boolean;
}

export interface ReplayState {
  /** number of events applied (0 = pre-traversal state) */
  index: number;
  total: number;
  /** the event most recently applied, or null before the first Step */
  currentEvent: ReplayEvent | null;
  nodes: Record<string, NodeView>;
  edges: Record<string, EdgeStatus>;
  /** primary focus of the current event (drawn as "current") */
  currentNode: string | null;
  /** other nodes that the current event mentions */
  relatedNodes: string[];
  currentEdge: string | null;
  discoveryOrder: string[];
  componentsStarted: number;
  /** found so far, sorted ascending ASCII */
  bridges: string[];
  articulationPoints: string[];
  /** true once the FINISH event has been applied */
  finished: boolean;
}

/**
 * Folds events[0..index) into the state the UI draws. This is the ONLY source
 * of map / table / summary values, so every visible number comes from the same
 * deterministic event list that Step and Run to End walk through.
 */
export function replayStateAt(graph: Graph, events: ReplayEvent[], index: number): ReplayState {
  const applied = Math.max(0, Math.min(index, events.length));

  const nodes: Record<string, NodeView> = {};
  for (const n of graph.nodes) {
    nodes[n.id] = {
      id: n.id, status: 'unvisited', parent: undefined,
      discovery: null, low: null, articulation: false,
    };
  }
  const edges: Record<string, EdgeStatus> = {};
  for (const e of graph.edges) edges[e.id] = 'unvisited';

  const discoveryOrder: string[] = [];
  const bridges = new Set<string>();
  const articulation = new Set<string>();
  let componentsStarted = 0;
  let finished = false;

  for (let i = 0; i < applied; i++) {
    const ev = events[i];
    switch (ev.type) {
      case 'COMPONENT_START':
        componentsStarted = ev.componentNo;
        break;
      case 'DISCOVER': {
        const v = nodes[ev.node];
        v.status = 'active';
        v.parent = ev.parent;
        v.discovery = ev.discovery;
        v.low = ev.low;
        discoveryOrder.push(ev.node);
        break;
      }
      case 'INSPECT_EDGE':
        nodes[ev.from].low = ev.lowAfter;
        if (ev.kind === 'tree') edges[ev.edge] = 'tree';
        else if (ev.kind === 'visited' && edges[ev.edge] === 'unvisited') edges[ev.edge] = 'non-tree';
        break;
      case 'RETURN_FROM_CHILD':
        nodes[ev.node].low = ev.lowAfter;
        break;
      case 'CLASSIFY_EDGE':
        if (ev.isBridge) {
          edges[ev.edge] = 'bridge';
          bridges.add(ev.edge);
        }
        break;
      case 'ARTICULATION':
        nodes[ev.node].articulation = true;
        articulation.add(ev.node);
        break;
      case 'NODE_COMPLETE':
        nodes[ev.node].status = 'done';
        break;
      case 'COMPONENT_COMPLETE':
        break;
      case 'FINISH':
        finished = true;
        break;
    }
  }

  const currentEvent = applied > 0 ? events[applied - 1] : null;
  let currentNode: string | null = null;
  let relatedNodes: string[] = [];
  let currentEdge: string | null = null;
  if (currentEvent) {
    switch (currentEvent.type) {
      case 'COMPONENT_START':
      case 'COMPONENT_COMPLETE':
        currentNode = currentEvent.root;
        break;
      case 'DISCOVER':
        currentNode = currentEvent.node;
        relatedNodes = currentEvent.parent === null ? [] : [currentEvent.parent];
        break;
      case 'INSPECT_EDGE':
        currentNode = currentEvent.from;
        relatedNodes = [currentEvent.to];
        currentEdge = currentEvent.edge;
        break;
      case 'RETURN_FROM_CHILD':
        currentNode = currentEvent.node;
        relatedNodes = [currentEvent.child];
        currentEdge = currentEvent.edge;
        break;
      case 'CLASSIFY_EDGE':
        currentNode = currentEvent.parent;
        relatedNodes = [currentEvent.child];
        currentEdge = currentEvent.edge;
        break;
      case 'ARTICULATION':
        currentNode = currentEvent.node;
        relatedNodes = currentEvent.child === null ? [] : [currentEvent.child];
        break;
      case 'NODE_COMPLETE':
        currentNode = currentEvent.node;
        break;
      case 'FINISH':
        break;
    }
  }

  return {
    index: applied,
    total: events.length,
    currentEvent,
    nodes,
    edges,
    currentNode,
    relatedNodes,
    currentEdge,
    discoveryOrder,
    componentsStarted,
    bridges: sortedIds(bridges),
    articulationPoints: sortedIds(articulation),
    finished,
  };
}
