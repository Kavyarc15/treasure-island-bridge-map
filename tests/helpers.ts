import { analyzeGraph } from '../src/engine';
import type { Analysis, Graph } from '../src/engine';

export function analyzeOk(graph: Graph): Analysis {
  const outcome = analyzeGraph(graph);
  if (!outcome.ok) throw new Error('expected a valid graph: ' + JSON.stringify(outcome.errors));
  return outcome.analysis;
}

/** Tiny deterministic PRNG (mulberry32) so "random" tests are repeatable. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Builds a small graph from a node id list and "ID:a-b" style edge specs. */
export function makeGraph(nodeIds: string[], edgeSpecs: Array<[string, string, string]>): Graph {
  return {
    nodes: nodeIds.map((id, i) => ({ id, name: `Island ${id}`, x: (i * 7) % 101, y: (i * 13) % 101 })),
    edges: edgeSpecs.map(([id, a, b]) => ({ id, a, b })),
  };
}
