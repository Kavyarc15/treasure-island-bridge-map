// Prints the analysis of the main archipelago as plain text (evidence for the interview).
// Usage: npm run report
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { analyzeGraph, describeEvent } from '../src/engine';

const outcome = analyzeGraph(MAIN_ARCHIPELAGO);
if (!outcome.ok) {
  console.error('INVALID GRAPH');
  for (const e of outcome.errors) console.error(`  ${e.code}: ${e.message}`);
  process.exit(1);
}
const a = outcome.analysis;
const names = Object.fromEntries(MAIN_ARCHIPELAGO.nodes.map((n) => [n.id, n.name]));

console.log('=== Sorted adjacency lists ===');
for (const id of Object.keys(a.adjacency).sort()) {
  console.log(`${id.padEnd(7)}: ${a.adjacency[id].map((x) => `${x.neighbour}(${x.edgeId})`).join(' ')}`);
}
console.log('\n=== Discovery order ===\n' + a.discoveryOrder.join(', '));
console.log('\n=== Parent / discovery / low table ===');
console.log('ID      PARENT   DISC LOW');
for (const r of a.table) console.log(`${r.id.padEnd(7)} ${String(r.parent).padEnd(8)} ${String(r.discovery).padStart(4)} ${String(r.low).padStart(3)}`);
console.log(`\n=== Component count ===\n${a.componentCount}`);
console.log(`\n=== Bridge IDs (sorted) ===\n${a.bridges.join(', ')}`);
console.log(`\n=== Articulation IDs (sorted) ===\n${a.articulationPoints.join(', ')}`);
console.log(`\n=== Replay events (${a.events.length}) ===`);
for (const e of a.events) {
  const d = describeEvent(e, names);
  console.log(`#${String(e.index).padStart(2, '0')} ${e.type.padEnd(18)} ${d.headline}${d.proof[0] ? '   [' + d.proof[0] + ']' : ''}`);
}
