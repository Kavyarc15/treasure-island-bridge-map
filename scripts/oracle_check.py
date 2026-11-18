"""Independent cross-check of docs/oracle.md. NOT used by the app.

Bridges and articulation points are found by the DEFINITION (remove an edge or
a node, count connected components), so they do not depend on the low-link
rules the app implements. Discovery/low come from a separate DFS.
"""

NODES = ["ANCHOR", "HARBOR", "KELP", "MANGO", "PEARL", "REEF", "SHELL", "TIDE", "WAVE"]
EDGES = {
    "BR01": ("ANCHOR", "HARBOR"), "BR02": ("HARBOR", "KELP"),
    "BR03": ("ANCHOR", "MANGO"), "BR04": ("MANGO", "REEF"),
    "BR05": ("REEF", "ANCHOR"), "BR06": ("REEF", "SHELL"),
    "BR07": ("SHELL", "TIDE"), "BR08": ("TIDE", "WAVE"),
    "BR09": ("WAVE", "SHELL"), "BR10": ("TIDE", "PEARL"),
}


def components(nodes, edges):
    adj = {n: set() for n in nodes}
    for a, b in edges.values():
        if a in adj and b in adj:
            adj[a].add(b)
            adj[b].add(a)
    seen, count = set(), 0
    for n in nodes:
        if n in seen:
            continue
        count += 1
        stack = [n]
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            stack.extend(adj[x] - seen)
    return count


base = components(NODES, EDGES)
bridges = sorted(e for e in EDGES
                 if components(NODES, {k: v for k, v in EDGES.items() if k != e}) > base)
arts = sorted(n for n in NODES
              if components([m for m in NODES if m != n], EDGES) > base)

# separate DFS for discovery / parent / low
adj = {n: [] for n in NODES}
for a, b in EDGES.values():
    adj[a].append(b)
    adj[b].append(a)
for n in adj:
    adj[n].sort()
disc, low, par, order = {}, {}, {}, []


def dfs(u, p):
    disc[u] = low[u] = len(order)
    order.append(u)
    par[u] = p
    for v in adj[u]:
        if v == p:
            continue
        if v in disc:
            low[u] = min(low[u], disc[v])
        else:
            dfs(v, u)
            low[u] = min(low[u], low[v])


for n in sorted(NODES):
    if n not in disc:
        dfs(n, None)

print("components      :", base)
print("discovery order :", order)
for n in NODES:
    print(f"{n:7} parent={par[n]} disc={disc[n]} low={low[n]}")
print("bridges (by definition)     :", bridges)
print("articulation (by definition):", arts)

assert base == 1
assert order == ["ANCHOR", "HARBOR", "KELP", "MANGO", "REEF", "SHELL", "TIDE", "PEARL", "WAVE"]
assert bridges == ["BR01", "BR02", "BR06", "BR10"]
assert arts == ["ANCHOR", "HARBOR", "REEF", "SHELL", "TIDE"]
assert [(par[n], disc[n], low[n]) for n in NODES] == [
    (None, 0, 0), ("ANCHOR", 1, 1), ("HARBOR", 2, 2), ("ANCHOR", 3, 0),
    ("TIDE", 7, 7), ("MANGO", 4, 0), ("REEF", 5, 5), ("SHELL", 6, 5), ("TIDE", 8, 5)]
print("ORACLE CHECK PASSED")
