# Cyclic scope scaling

`scope(cyclic100).export()`, the runtime body of the `cyclic(100)` bench in `ark/type/__tests__/cyclic.bench.ts`, took 80 s on arktype 2.2.8 and 210 s on featherduster. CI never runs it, because the bench only asserts type instantiations. This records why it was slow, what was tried and what changed.

The timings ran in a fresh Node 25.2.1 process per run, on a 16-core WSL2 machine whose load average was 21-60 from other work, so expect ±30% on any single run. Each one gives n.

## Results

| `scope(x).export()` | cyclic10         | cyclic100            | cyclic500         |
| ------------------- | ---------------- | -------------------- | ----------------- |
| 2.2.8 (`main`)      | 61-82 ms (n=5)   | 79.6 s, 85.3 s (n=2) | not run           |
| featherduster       | 200-338 ms (n=5) | 210 s (n=1)          | not run           |
| this change         | 138-177 ms (n=5) | 406-702 ms (n=5)     | 1.90-2.14 s (n=3) |

Going from cyclic100 to cyclic500 now costs about 3.6× time for 5× aliases.

## Why it was slow

### Copying references through aliases

Every node held `referencesById`, and exporting a scope extended each node's map with everything it reached through aliases. It did that once per export (`bootstrapAliasReferences`, added in #1126):

```ts
for (const aliasNode of aliases) {
	addReferences(aliasNode.referencesById, aliasNode.resolution.referencesById)
	for (const ref of resolution.references)
		if (aliasNode.id in ref.referencesById)
			addReferences(ref.referencesById, aliasNode.referencesById)
}
```

That costs exports × aliases × references × references per node. In a cyclic scope all four grow with the cycle, and later exports re-walked maps that were already complete.

On 2.2.8, cyclic100 copied 353M map entries, which was 93 s of a 103 s export (instrumented, n=1). A CPU profile put about 105 of 124 s in this function and its inlined body.

### More aliases on featherduster

Bisecting on the number of copied entries for a generated 30-alias scope, which is deterministic, gave 5.6M up to 97059c4fe and 14.6M from 5bd4ed523 ("reference an open component's members by alias") on.

That commit references a mutual cycle's members by alias instead of inlining one into the other. It fixed order-dependent shapes and an exponential blowup. It also raised the aliases each export reached from 4 to 13, which the copying multiplied.

### `reaches`

Reading `transforms` or `allowsRequiresTraversal` walks the resolutions a node's aliases reach, iterating each one's references (333fea95f, ab051d56f). Each node walks once, but in a cycle each walk reaches every resolution, so precompiling costs nodes × resolutions × references. This was 22 s of featherduster's cyclic100 profile, and 13.5 of 19 s at cyclic500 once the copying was gone.

### Smaller costs

- On 2.2.8 only, eager `flatRefs` dedupe (`flatRefsAreEqual`) is 7.6 s of cyclic100. featherduster builds `flatRefs` lazily.

## What was tried

1. **Closing references once per cycle (Tarjan's algorithm).** This merges each strongly connected component of resolutions once and remembers closed nodes across exports. The maps are exact closures. They're identical to the copies wherever the copying finished, and the copying left 7-17 of about 270 nodes short in five generated scopes.

   featherduster cyclic100 dropped to 17-22 s (n=3), and to 1.2-1.6 s (n=5) together with the `reaches` cache below. cyclic500 still took 34-38 s (n=2), because every node in a cycle of V nodes holds its own V-entry map, which is V² by construction. On 2.2.8 the same change takes cyclic100 to 10.3-12.4 s (n=3).

   A first version missed the closure of a component that finished during the recursion. That left the root of a standalone `.type()` short, which broke compiled code on 2.2.8 (`this.intersection219Apply is not a function`).

2. **References as what a node is built from (kept).** An alias is a leaf of `referencesById`, as it already was for every alias-free node. Anything that needs what a node reaches through aliases walks them with `referencesThroughAliases`, once, where it reads them.

## The change

- **References.** `referencesById` and `references` are the node, its children, a union's discriminated cases and the node a morph pipes to, transitively. Every node collects them on first read, aliased or not, since they no longer change after construction except for a union's cases.
- **`referencesThroughAliases`.** It also adds each reached alias's resolution's references. It's keyed by id, as the maps were, because a scope binds a copy of a foreign node under the same id.
- **Precompilation.** Export and finalize precompile `referencesThroughAliases` of the export or root, so a unit declares and binds the same nodes as before.
- **`trackedId`.** It finds an equal resolution among the nodes its aliases reach.
- **`select` and `transform`.** With the `"references"` boundary, they read the walk once resolution is final, as `transform` already did.
- **Unchanged consumers.** The rest of the readers either already walked aliases themselves (`reaches`), stop at any alias (`isLeafIn`, `isDecidedByAllows`), or run while a node is constructed, before anything was ever added (`operationsOf`).
- **`reaches` cache.** When a `reaches` walk finds nothing, every node it reached reaches only a subset of what the walk covered, so once inputs and outputs are final they cache `false`. Later walks skip them.

## Evidence that behavior is unchanged

The comparison battery covered 9 hand-written cyclic scopes (mutual, optional, unions, private aliases, intersections, `this`, discriminated, morphs) and 30 generated ones of 10-30 aliases, half of them with trimmed, piped and contextually narrowed props. It compared this change with featherduster before it:

- **Identical:** validation results and messages, jit and jitless, on 6 data values per export with shared and cyclic objects. Also `allows`, `extends`, `equals`, intersections, expressions, `json`, and standalone `.type()`.
- **JSON Schema:** identical up to node ids and `$defs` order (629 of 629).
- **`select({ boundary: "references" })`:** differs only where the copied maps were short. It matches the exact-closure build line for line.
- **Compiled units:** identical with ids stripped (cyclic10, cyclic100 and two generated scopes).
- **`transforms` and `allowsRequiresTraversal`:** identical for every node of three generated scopes with morphs and narrows.
- **Tests:** `ark/type/__tests__/references.test.ts` checks that collected references match copied ones for aliased nodes too, that an alias is a leaf of `references`, and that selecting references reaches exactly what an independent walk through aliases reaches.

## What remains

A cyclic500 profile after this change (1.95 s, n=1) breaks down as:

- parsing: 0.75 s
- precompiling: 0.81 s, of which `reaches` is 0.36 s
- collecting references: 0.29 s

None of these dominates. 2.2.8 still copies through aliases. The closure version of the fix applies to it unchanged, but it was not landed.
