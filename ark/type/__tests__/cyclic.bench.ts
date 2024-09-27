import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.ts"

bench.baseline(() => type("never"))

bench(
	"cyclic 10 intersection",
	() => scope(cyclic10).type("user&user2").infer
).types([48506, "instantiations"])

bench("cyclic(10)", () => scope(cyclic10).export()).types([
	6719,
	"instantiations"
])

bench("cyclic(100)", () => scope(cyclic100).export()).types([
	37928,
	"instantiations"
])

bench("cyclic(500)", () => scope(cyclic500).export()).types([
	171695,
	"instantiations"
])
