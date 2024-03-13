import { bench } from "@arktype/attest"
import { node } from "../../builtins/ark.js"

bench("domain", () => {
	return node("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return node("string").and(node("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	node({ domain: "string", regex: "/.*/" })
}).types([350, "instantiations"])
