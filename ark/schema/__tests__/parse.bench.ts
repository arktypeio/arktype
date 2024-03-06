import { bench } from "@arktype/attest"
import { schema, type Node, type TypeKind } from "@arktype/schema"

bench("domain", () => {
	return schema("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return schema("string").and(schema("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	schema({ domain: "string", regex: "/.*/" })
}).types([350, "instantiations"])

bench("assignment", () => {
	// previously had issues with a union complexity error when assigning to Root | undefined
	const n: Node<TypeKind> | undefined = schema({
		domain: "string",
		regex: "/.*/"
	})
}).types([1329, "instantiations"])
