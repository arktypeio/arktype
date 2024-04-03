import { bench } from "@arktype/attest"
import { schema } from "@arktype/schema"

bench("domain", () => {
	return schema("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return schema("string").and(schema("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	schema({ domain: "string", regex: "/.*/" })
}).types([350, "instantiations"])
