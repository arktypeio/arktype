import { bench } from "@arktype/attest"
import { node } from "../nodes.js"

bench("domain", () => {
	return node("string").infer
}).types()

bench("domain", () => {
	return node("string").infer
}).types()
