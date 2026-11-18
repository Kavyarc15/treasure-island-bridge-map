# Event schema and emission order

The engine records one flat, ordered list of events. The list is fixed and
repeatable for a given graph: array order and map coordinates never change it.
`Step` advances the replay index by exactly one event. `Run to End` advances
through the **same** list. The UI never re-runs the algorithm; every value it
shows is folded from `events[0..index]`.

## Decisions

| Question | Decision |
|---|---|
| Undirected edge recorded once or twice? | **Twice**, once from each adjacency entry, because the DFS inspects every adjacency entry. The second visit of a tree edge, seen from the child, is recorded as kind `parent`. |
| Ancestor sees an already-discovered descendant | `INSPECT_EDGE` kind `visited`; the low value is unchanged because the descendant's discovery is larger. It is still recorded so no edge is skipped. |
| Order after finishing a child | `NODE_COMPLETE(child)` → `RETURN_FROM_CHILD` → `CLASSIFY_EDGE` → `ARTICULATION` (only if triggered). |
| Non-root articulation event | Emitted right after the child's `CLASSIFY_EDGE`, **once per node** (first time it qualifies). |
| Root articulation event | Emitted when the root finishes, if it has at least 2 tree children, just before `NODE_COMPLETE(root)`. |
| Component count | Number of DFS roots (isolated nodes count). |
| Sort order | Plain code-unit (ASCII) comparison. Never `localeCompare`. |

## Event types

Every event has `index` (position) and `type`.

| Type | Fields | Meaning |
|---|---|---|
| `COMPONENT_START` | `root`, `componentNo` | A new unvisited root is picked (ascending ID order). |
| `DISCOVER` | `node`, `parent`, `discovery`, `low` | First reach of a node. `discovery = low = clock`; clock then increments. |
| `INSPECT_EDGE` | `edge`, `from`, `to`, `kind` (`tree`/`parent`/`visited`), `lowBefore`, `lowAfter`, `discoveryOfNeighbour` (visited only) | One adjacency entry examined. `visited` applies `low[from] = min(low[from], discovery[to])`. |
| `RETURN_FROM_CHILD` | `node` (parent u), `child` (v), `edge`, `lowBefore`, `lowAfter`, `lowChild` | After child `v` finished: `low[u] = min(low[u], low[v])`. |
| `CLASSIFY_EDGE` | `edge`, `parent`, `child`, `lowChild`, `discoveryParent`, `isBridge` | Applies `low[v] > discovery[u]` (strict). |
| `ARTICULATION` | `node`, `reason` (`non-root` / `root-two-children`), `child?`, `lowChild?`, `discoveryNode?`, `childCount?` | Non-root: `low[v] >= discovery[u]`. Root: at least 2 DFS children. |
| `NODE_COMPLETE` | `node` | All of the node's neighbours have been handled. |
| `COMPONENT_COMPLETE` | `root`, `componentNo`, `nodeCount` | A DFS tree is finished. |
| `FINISH` | `componentCount`, `bridges`, `articulationPoints` | Last event; final sorted results. |

## Emission order (pseudocode)

```
for root in nodes sorted ascending, if unvisited:
    COMPONENT_START(root)
    visit(root, parent = null)
    COMPONENT_COMPLETE(root)
FINISH

visit(u, parentNode):
    DISCOVER(u)
    for (v, e) in adjacency[u] sorted ascending by v:
        if v == parentNode:            INSPECT_EDGE(kind = parent)
        elif v unvisited:
            INSPECT_EDGE(kind = tree)
            visit(v, u)
            RETURN_FROM_CHILD(u, v)    # low[u] = min(low[u], low[v])
            CLASSIFY_EDGE(e)           # bridge iff low[v] > discovery[u]
            if u not root and low[v] >= discovery[u] and u not yet flagged:
                ARTICULATION(u, non-root)
        else:
            INSPECT_EDGE(kind = visited)   # low[u] = min(low[u], discovery[v])
    if u is root and treeChildren >= 2:
        ARTICULATION(u, root-two-children)
    NODE_COMPLETE(u)
```

Because no parallel edges are allowed, "skip the parent" by node ID is equivalent
to skipping the parent edge.

## State derived by folding events (what the UI shows)

- **Node table:** parent, discovery, low (updated by `DISCOVER`, `INSPECT_EDGE` visited, `RETURN_FROM_CHILD`).
- **Node states:** unvisited, current (focus of the current event), visited, articulation.
- **Edge states:** unvisited (not yet inspected), tree, inspected non-tree, bridge.
- **Summaries:** bridges and articulation points found so far, sorted ASCII; marked final at `FINISH`.
