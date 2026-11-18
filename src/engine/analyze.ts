import { compareIds, sortedIds } from './order';
import type {
  Adjacency,
  Analysis,
  AnalysisOutcome,
  Graph,
  NodeRow,
  ReplayEvent,
} from './types';
import { validateGraph } from './validate';

/**
 * Adjacency is built from IDs, never from source order: every list is sorted
 * ascending by neighbour ID (ASCII). The input graph is not mutated.
 */
export function buildAdjacency(graph: Graph): Adjacency {
  const adjacency: Adjacency = {};
  for (const node of graph.nodes) adjacency[node.id] = [];
  for (const edge of graph.edges) {
    adjacency[edge.a].push({ neighbour: edge.b, edgeId: edge.id });
    adjacency[edge.b].push({ neighbour: edge.a, edgeId: edge.id });
  }
  for (const id of Object.keys(adjacency)) {
    adjacency[id].sort((p, q) => compareIds(p.neighbour, q.neighbour));
  }
  return adjacency;
}

type DistributiveOmitIndex<T> = T extends unknown ? Omit<T, 'index'> : never;
type EventInput = DistributiveOmitIndex<ReplayEvent>;

/**
 * Validates the whole graph, then runs low-link DFS over every component and
 * records the replay events (see docs/event-schema.md for the fixed order).
 * Invalid input returns errors only: no events, no table, no partial analysis.
 */
export function analyzeGraph(input: unknown): AnalysisOutcome {
  const validation = validateGraph(input);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const graph = input as Graph;
  const adjacency = buildAdjacency(graph);
  const rootsAscending = sortedIds(graph.nodes.map((n) => n.id));

  const events: ReplayEvent[] = [];
  const emit = (event: EventInput): void => {
    events.push({ ...event, index: events.length } as ReplayEvent);
  };

  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const discoveryOrder: string[] = [];
  const bridgeSet = new Set<string>();
  const articulationSet = new Set<string>();
  let clock = 0; // ONE zero-based clock shared by all components
  let componentCount = 0;

  /** Returns the number of nodes in the DFS subtree of `u` (including u). */
  const visit = (u: string, parentNode: string | null): number => {
    discovery.set(u, clock);
    low.set(u, clock);
    parent.set(u, parentNode);
    discoveryOrder.push(u);
    emit({ type: 'DISCOVER', node: u, parent: parentNode, discovery: clock, low: clock });
    clock += 1;

    let treeChildren = 0;
    let subtreeSize = 1;

    for (const { neighbour: v, edgeId } of adjacency[u]) {
      if (v === parentNode) {
        // No parallel edges exist, so skipping the parent node == skipping the parent edge.
        const l = low.get(u)!;
        emit({
          type: 'INSPECT_EDGE', edge: edgeId, from: u, to: v, kind: 'parent',
          lowBefore: l, lowAfter: l, discoveryOfNeighbour: null,
        });
      } else if (!discovery.has(v)) {
        const l = low.get(u)!;
        emit({
          type: 'INSPECT_EDGE', edge: edgeId, from: u, to: v, kind: 'tree',
          lowBefore: l, lowAfter: l, discoveryOfNeighbour: null,
        });
        treeChildren += 1;
        subtreeSize += visit(v, u);

        const lowBefore = low.get(u)!;
        const lowChild = low.get(v)!;
        const lowAfter = Math.min(lowBefore, lowChild);
        low.set(u, lowAfter);
        emit({
          type: 'RETURN_FROM_CHILD', node: u, child: v, edge: edgeId,
          lowBefore, lowAfter, lowChild,
        });

        const discoveryParent = discovery.get(u)!;
        const isBridge = lowChild > discoveryParent; // strict
        if (isBridge) bridgeSet.add(edgeId);
        emit({
          type: 'CLASSIFY_EDGE', edge: edgeId, parent: u, child: v,
          lowChild, discoveryParent, isBridge,
        });

        if (parentNode !== null && lowChild >= discoveryParent && !articulationSet.has(u)) {
          articulationSet.add(u); // non-root rule uses >=
          emit({
            type: 'ARTICULATION', node: u, reason: 'non-root', child: v,
            lowChild, discoveryNode: discoveryParent, childCount: null,
          });
        }
      } else {
        const lowBefore = low.get(u)!;
        const discNeighbour = discovery.get(v)!;
        const lowAfter = Math.min(lowBefore, discNeighbour);
        low.set(u, lowAfter);
        emit({
          type: 'INSPECT_EDGE', edge: edgeId, from: u, to: v, kind: 'visited',
          lowBefore, lowAfter, discoveryOfNeighbour: discNeighbour,
        });
      }
    }

    if (parentNode === null && treeChildren >= 2) {
      articulationSet.add(u); // root rule: at least two DFS-tree children
      emit({
        type: 'ARTICULATION', node: u, reason: 'root-two-children', child: null,
        lowChild: null, discoveryNode: discovery.get(u)!, childCount: treeChildren,
      });
    }

    emit({ type: 'NODE_COMPLETE', node: u });
    return subtreeSize;
  };

  for (const root of rootsAscending) {
    if (discovery.has(root)) continue;
    componentCount += 1;
    emit({ type: 'COMPONENT_START', root, componentNo: componentCount });
    const nodeCount = visit(root, null);
    emit({ type: 'COMPONENT_COMPLETE', root, componentNo: componentCount, nodeCount });
  }

  const bridges = sortedIds(bridgeSet);
  const articulationPoints = sortedIds(articulationSet);
  emit({ type: 'FINISH', componentCount, bridges, articulationPoints });

  const table: NodeRow[] = rootsAscending.map((id) => ({
    id,
    parent: parent.get(id)!,
    discovery: discovery.get(id)!,
    low: low.get(id)!,
  }));

  const analysis: Analysis = {
    adjacency,
    events,
    discoveryOrder,
    table,
    componentCount,
    bridges,
    articulationPoints,
  };
  return { ok: true, analysis };
}
