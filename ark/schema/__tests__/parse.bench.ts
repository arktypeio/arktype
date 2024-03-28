import { bench } from "@arktype/attest"
import { root } from "@arktype/schema"

bench("domain", () => {
	return root("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return root("string").and(root("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	root({ domain: "string", regex: "/.*/" })
}).types([350, "instantiations"])
