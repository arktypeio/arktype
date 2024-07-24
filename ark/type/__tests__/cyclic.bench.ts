import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.js"

type("never")

bench("cyclic 10 intersection", () => {
	const s = scope(cyclic10).type("user&user2").infer
}).types([28410, "instantiations"])

bench("cyclic(10)", () => {
	const types = scope(cyclic10).export()
}).types([6558, "instantiations"])

bench("cyclic(100)", () => {
	const types = scope(cyclic100).export()
}).types([38209, "instantiations"])

bench("cyclic(500)", () => {
	const types = scope(cyclic500).export()
}).types([174572, "instantiations"])
