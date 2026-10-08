import { attest, contextualize } from "@ark/attest"
import type { BaseNode } from "@ark/schema"
import { scope, type } from "arktype"

const referencedBesidesChildren = (node: BaseNode): BaseNode[] =>
	node.hasKind("union") ? node.caseNodes
	: node.hasKind("morph") && node.lastMorphIfNode ? [node.lastMorphIfNode]
	: []

const reachableFrom = (roots: BaseNode[]): BaseNode[] => {
	const reached = new Set<BaseNode>()
	const reach = (node: BaseNode) => {
		if (reached.has(node)) return
		reached.add(node)
		for (const child of node.children) reach(child)
		for (const referenced of referencedBesidesChildren(node)) reach(referenced)
	}
	for (const root of roots) reach(root)
	return [...reached]
}

const copiedReferences = (node: BaseNode): Record<string, BaseNode> => {
	const referencesById: Record<string, BaseNode> = { [node.id]: node }
	for (const child of node.children)
		Object.assign(referencesById, child.referencesById)
	for (const referenced of referencedBesidesChildren(node))
		Object.assign(referencesById, referenced.referencesById)
	return referencesById
}

contextualize(() => {
	it("collected references match copied references", () => {
		const Shared = type({ k: "'x'", v: "string" }).or({ k: "'y'" })
		const types = scope({
			shared: Shared,
			holder: { a: "shared", b: Shared, c: [Shared, "|", "null"] }
		}).export()
		const nodes = reachableFrom([
			type({
				a: "string",
				b: "number = 1",
				"c?": "boolean[]",
				nested: { x: "string.numeric.parse" }
			}).internal,
			type({ kind: "'a'", a: "string" })
				.or({ kind: "'b'", b: "number" })
				.or({ kind: "'c'", c: "boolean" }).internal,
			type(["string", "number = 5", "...", "boolean[]"]).internal,
			type("string.json.parse").to({ a: "string" }).internal,
			types.holder.internal,
			type({ a: types.shared, b: types.shared }).internal
		]).filter(node => !node.includesAlias)

		// a scope binds a copy of a foreign node, with its id, per reference
		const nodesById: Record<string, BaseNode> = {}
		attest(
			nodes.some(node => {
				const previous = nodesById[node.id]
				nodesById[node.id] = node
				return previous !== undefined && previous !== node
			})
		).equals(true)

		for (const node of nodes) {
			const expected = copiedReferences(node)
			attest(Object.keys(node.referencesById)).equals(Object.keys(expected))
			for (const id in expected)
				attest(node.referencesById[id] === expected[id]).equals(true)
		}
	})

	it("pipe to cyclic root alias", () => {
		const types = scope({
			node: { value: "string", next: "node | null" }
		}).export()
		const T = type({ a: type("string.json.parse").to(types.node), b: "number" })
		const morph = T.internal.select({ kind: "morph", method: "assertFind" })

		attest(morph.isCyclic).equals(false)
		attest(morph.includesAlias).equals(true)
		attest(T.internal.isCyclic).equals(false)
		attest(T.internal.includesAlias).equals(true)
	})
})
