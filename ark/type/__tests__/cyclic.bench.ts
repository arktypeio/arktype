import { bench } from "@arktype/attest"
import { scope } from "arktype"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.js"

bench("cyclic 10 intersection", () => {
	const s = scope(cyclic10).type("user&user2").infer
}).types([30633, "instantiations"])

bench("cyclic(10)", () => {
	const types = scope(cyclic10).export()
}).types([7538, "instantiations"])

bench("cyclic(100)", () => {
	const types = scope(cyclic100).export()
}).types([38109, "instantiations"])

bench("cyclic(500)", () => {
	const types = scope(cyclic500).export()
}).types([169672, "instantiations"])
