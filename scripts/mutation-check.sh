#!/usr/bin/env bash
# Breaks the engine on purpose, one rule at a time, and shows that the tests notice.
# Usage: bash scripts/mutation-check.sh   (restores src/engine/analyze.ts afterwards)
set -u
cd "$(dirname "$0")/.."
F=src/engine/analyze.ts
cp "$F" /tmp/analyze.original.ts
trap 'cp /tmp/analyze.original.ts "$F"' EXIT
run() { npx vitest run 2>&1 | grep -E "^ +Tests " ; cp /tmp/analyze.original.ts "$F"; }
echo "baseline:"; run
echo "M1 bridge uses >= instead of > (strict rule)";            sed -i 's/const isBridge = lowChild > discoveryParent;/const isBridge = lowChild >= discoveryParent;/' $F; run
echo "M2 non-root articulation uses > instead of >=";            sed -i 's/lowChild >= discoveryParent \&\& !articulationSet/lowChild > discoveryParent \&\& !articulationSet/' $F; run
echo "M3 root articulation needs 1 child instead of 2";          sed -i 's/treeChildren >= 2/treeChildren >= 1/' $F; run
echo "M4 back edge uses low[neighbour] instead of discovery";    sed -i 's/const lowAfter = Math.min(lowBefore, discNeighbour);/const lowAfter = Math.min(lowBefore, low.get(v)!);/' $F; run
echo "M5 discovery clock reset for every component";             sed -i 's/componentCount += 1;/componentCount += 1; clock = 0;/' $F; run
echo "M6 roots chosen in descending order";                      sed -i 's/for (const root of rootsAscending) {/for (const root of [...rootsAscending].reverse()) {/' $F; run
echo "M7 neighbours not sorted (source order)";                  sed -i 's/adjacency\[id\].sort((p, q) => compareIds(p.neighbour, q.neighbour));/void compareIds;/' $F; run
echo "restored:"; run
