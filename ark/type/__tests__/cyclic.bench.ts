import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.ts"

bench.baseline(() => type("never"))

bench(
	"cyclic 10 intersection",
	() => scope(cyclic10).type("user&user2").infer
).types([14500, "instantiations"])

bench("cyclic(10)", () => scope(cyclic10).export()).types([
	12945,
	"instantiations"
])

bench("cyclic(100)", () => scope(cyclic100).export()).types([
	58647,
	"instantiations"
])

bench("cyclic(500)", () => scope(cyclic500).export()).types([
	242562,
	"instantiations"
])
