import { bench } from "@arktype/attest"
import { node, type Node, type RootKind } from "@arktype/schema"

bench("domain", () => {
	return node("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return node("string").and(node("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	node({ basis: "string", pattern: "/.*/" })
}).types([350, "instantiations"])

bench("assignment", () => {
	// previously had issues with a union complexity error when assigning to Root | undefined
	const root: Node<RootKind> | undefined = node({
		basis: "string",
		pattern: "/.*/"
	})
}).types([1329, "instantiations"])
