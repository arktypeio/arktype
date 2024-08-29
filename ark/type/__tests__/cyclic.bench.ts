import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.ts"

bench.baseline(() => type("never"))

bench("cyclic 10 intersection", () => {
	const s = scope(cyclic10).type("user&user2").infer
}).types([41261, "instantiations"])

bench("cyclic(10)", () => {
	const types = scope(cyclic10).export()
}).types([6914, "instantiations"])

bench("cyclic(100)", () => {
	const types = scope(cyclic100).export()
}).types([39923, "instantiations"])

bench("cyclic(500)", () => {
	const types = scope(cyclic500).export()
}).types([181690, "instantiations"])
