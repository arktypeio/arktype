import { bench } from "@arktype/attest"
import { node } from "../nodes.js"

bench("domain", () => {
	return node("string").infer
}).types([2, "instantiations"])

bench("domain", () => {
	return node("string").and(node("string"))
}).types([2, "instantiations"])
