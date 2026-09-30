import { attest, contextualize } from "@ark/attest"
import { node, type BaseNode } from "@ark/schema"
import { scope, type } from "arktype"

// the nodes a node references besides its children
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

// what referencesById held when each node copied its children's on
// construction, which a node whose references include no alias still does
const copiedReferences = (node: BaseNode): Record<string, BaseNode> => {
	const referencesById: Record<string, BaseNode> = { [node.id]: node }
	for (const child of node.children)
		Object.assign(referencesById, child.referencesById)
	for (const referenced of referencedBesidesChildren(node))
		Object.assign(referencesById, referenced.referencesById)
	return referencesById
}

contextualize(() => {
	it("collected references are those copying each child's gives", () => {
		const Shared = type({ k: "'x'", v: "string" }).or({ k: "'y'" })
		const $ = scope({
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
			$.holder.internal,
			type({ a: $.shared, b: $.shared }).internal
		]).filter(node => !node.includesAlias)

		// a scope binds a copy of a node from another scope each time it is
		// referenced, so some node's references hold one copy of a node with
		// its id and replace it with another
		const ids = new Map<string, BaseNode>()
		attest(
			nodes.some(node => {
				const copy = ids.get(node.id)
				ids.set(node.id, node)
				return copy !== undefined && copy !== node
			})
		).equals(true)

		for (const node of nodes) {
			const expected = copiedReferences(node)
			attest(Object.keys(node.referencesById)).equals(Object.keys(expected))
			for (const id in expected)
				attest(node.referencesById[id] === expected[id]).equals(true)
		}
	})

	it("a union discriminates when first read", () => {
		const U = node("union", [
			{
				domain: "object",
				required: [
					{ key: "firstReadKind", value: { unit: "a" } },
					{ key: "a", value: "string" }
				]
			},
			{
				domain: "object",
				required: [
					{ key: "firstReadKind", value: { unit: "b" } },
					{ key: "b", value: "number" }
				]
			}
		])
		attest(U.caseNodes.length).equals(0)

		// its cases are among its references
		const references = U.references
		attest(U.caseNodes.length).equals(2)
		for (const caseNode of U.caseNodes)
			attest(references.includes(caseNode)).equals(true)
		attest(U.discriminant?.path).equals(["firstReadKind"])
	})

	it("a node that pipes to a cyclic root includes an alias", () => {
		const $ = scope({ node: { value: "string", next: "node | null" } }).export()
		const T = type({ a: type("string.json.parse").to($.node), b: "number" })
		const morph = T.internal.select({ kind: "morph", method: "assertFind" })

		attest(morph.isCyclic).equals(false)
		attest(morph.includesAlias).equals(true)
		// so their references are copied on construction, before the scope
		// can add an alias's resolution to the morph's
		attest(T.internal.isCyclic).equals(false)
		attest(T.internal.includesAlias).equals(true)
	})
})
