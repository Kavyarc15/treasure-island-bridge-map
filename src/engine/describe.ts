import type { ReplayEvent } from './types';

export type Tone = 'info' | 'update' | 'safe' | 'bridge' | 'articulation' | 'done';

export interface EventDescription {
  headline: string;
  /** plain-language explanation for volunteers */
  detail: string;
  /** exact numerical proof lines (formulas with the real values) */
  proof: string[];
  tone: Tone;
}

/** Plain-text description of one event. Pure function: same event, same text. */
export function describeEvent(ev: ReplayEvent, names: Record<string, string> = {}): EventDescription {
  // "Harbour Market (food stalls)" -> "Harbour Market (HARBOR)": drop the role in brackets.
  const short = (name: string): string => name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
  const L = (id: string): string => (names[id] ? `${short(names[id])} (${id})` : id);

  switch (ev.type) {
    case 'COMPONENT_START':
      return {
        headline: `Start component ${ev.componentNo} at ${L(ev.root)}`,
        detail: `${ev.root} is the smallest island ID not visited yet, so the inspection begins here.`,
        proof: [],
        tone: 'info',
      };

    case 'DISCOVER':
      return {
        headline: `Enter ${L(ev.node)}`,
        detail:
          ev.parent === null
            ? `${ev.node} is the root of this search tree, so it has no parent.`
            : `Arrived from ${ev.parent}, which becomes the parent of ${ev.node}.`,
        proof: [
          `discovery[${ev.node}] = low[${ev.node}] = ${ev.discovery}`,
          `clock moves on to ${ev.discovery + 1}`,
        ],
        tone: 'info',
      };

    case 'INSPECT_EDGE':
      if (ev.kind === 'tree') {
        return {
          headline: `Cross bridge ${ev.edge}: ${ev.from} → ${ev.to}`,
          detail: `${ev.to} has not been visited, so ${ev.edge} becomes a DFS tree edge and the search goes to ${ev.to}.`,
          proof: [`low[${ev.from}] stays ${ev.lowBefore} for now`],
          tone: 'info',
        };
      }
      if (ev.kind === 'parent') {
        return {
          headline: `Look back along ${ev.edge}: ${ev.from} ↔ ${ev.to}`,
          detail: `${ev.to} is the parent of ${ev.from}. The bridge we arrived by is not an alternate route, so it is skipped.`,
          proof: [`low[${ev.from}] unchanged = ${ev.lowBefore}`],
          tone: 'info',
        };
      }
      return {
        headline: `Connection ${ev.edge}: ${ev.from} – ${ev.to} (already visited)`,
        detail:
          ev.lowAfter < ev.lowBefore
            ? `${ev.to} was reached earlier (time ${ev.discoveryOfNeighbour}). This is a loop: ${ev.from} has an alternate way back, so low[${ev.from}] drops.`
            : `${ev.to} was reached at time ${ev.discoveryOfNeighbour}, which is not earlier than what ${ev.from} can already reach, so low[${ev.from}] does not change.`,
        proof: [
          `low[${ev.from}] = min(${ev.lowBefore}, discovery[${ev.to}] = ${ev.discoveryOfNeighbour}) = ${ev.lowAfter}`,
        ],
        tone: ev.lowAfter < ev.lowBefore ? 'update' : 'info',
      };

    case 'RETURN_FROM_CHILD':
      return {
        headline: `Return from ${L(ev.child)} to ${ev.node}`,
        detail:
          ev.lowAfter < ev.lowBefore
            ? `The branch through ${ev.child} loops back further than ${ev.node} could reach alone, so low[${ev.node}] drops.`
            : `The branch through ${ev.child} reaches no earlier than ${ev.node} already could, so low[${ev.node}] stays the same.`,
        proof: [
          `low[${ev.node}] = min(${ev.lowBefore}, low[${ev.child}] = ${ev.lowChild}) = ${ev.lowAfter}`,
        ],
        tone: ev.lowAfter < ev.lowBefore ? 'update' : 'info',
      };

    case 'CLASSIFY_EDGE':
      return ev.isBridge
        ? {
            headline: `${ev.edge} is a BRIDGE`,
            detail: `Nothing in the branch below ${ev.child} can get back to ${ev.parent} or earlier except across ${ev.edge}. If ${ev.edge} closes, that branch is cut off.`,
            proof: [`low[${ev.child}] = ${ev.lowChild} > discovery[${ev.parent}] = ${ev.discoveryParent}  → bridge`],
            tone: 'bridge',
          }
        : {
            headline: `${ev.edge} is not a bridge`,
            detail: `The branch below ${ev.child} has another way back to ${ev.parent} (or earlier), so closing ${ev.edge} does not cut anything off.`,
            proof: [`low[${ev.child}] = ${ev.lowChild} ≤ discovery[${ev.parent}] = ${ev.discoveryParent}  → not a bridge`],
            tone: 'safe',
          };

    case 'ARTICULATION':
      return ev.reason === 'non-root'
        ? {
            headline: `${L(ev.node)} is an articulation island`,
            detail: `The branch through ${ev.child} cannot get around ${ev.node}: every route out of it passes through ${ev.node} itself. Closing ${ev.node} would cut that branch off.`,
            proof: [`low[${ev.child}] = ${ev.lowChild} ≥ discovery[${ev.node}] = ${ev.discoveryNode}  → articulation`],
            tone: 'articulation',
          }
        : {
            headline: `${L(ev.node)} is an articulation island (root)`,
            detail: `${ev.node} started this search and has ${ev.childCount} separate branches that only meet at ${ev.node}. Closing it would split them apart.`,
            proof: [`root ${ev.node} has ${ev.childCount} DFS-tree children (needs ≥ 2)  → articulation`],
            tone: 'articulation',
          };

    case 'NODE_COMPLETE':
      return {
        headline: `Finished ${ev.node}`,
        detail: `Every connection of ${ev.node} has been inspected.`,
        proof: [],
        tone: 'info',
      };

    case 'COMPONENT_COMPLETE':
      return {
        headline: `Component ${ev.componentNo} complete`,
        detail: `${ev.nodeCount} island${ev.nodeCount === 1 ? '' : 's'} reached from ${ev.root}.`,
        proof: [],
        tone: 'done',
      };

    case 'FINISH':
      return {
        headline: 'Inspection complete',
        detail: `${ev.componentCount} component${ev.componentCount === 1 ? '' : 's'}. Critical bridges: ${
          ev.bridges.length ? ev.bridges.join(', ') : 'none'
        }. Articulation islands: ${ev.articulationPoints.length ? ev.articulationPoints.join(', ') : 'none'}.`,
        proof: [],
        tone: 'done',
      };
  }
}
