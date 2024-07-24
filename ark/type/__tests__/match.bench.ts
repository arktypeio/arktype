import { bench } from "@ark/attest"
import { match } from "arktype"

bench("when(3)", () => {
	const matcher = match()
		.when("0", n => `${n}` as const)
		.when("1", n => `${n}` as const)
		.when("2", n => `${n}` as const)
		.orThrow()

	const zero = matcher(0)
	const one = matcher(1)
	const two = matcher(2)
}).types([34953, "instantiations"])

bench("when(10)", () => {
	const matcher = match()
		.when("0", n => `${n}` as const)
		.when("1", n => `${n}` as const)
		.when("2", n => `${n}` as const)
		.when("3", n => `${n}` as const)
		.when("4", n => `${n}` as const)
		.when("5", n => `${n}` as const)
		.when("6", n => `${n}` as const)
		.when("7", n => `${n}` as const)
		.when("8", n => `${n}` as const)
		.when("9", n => `${n}` as const)
		.orThrow()

	const zero = matcher(0)
	const one = matcher(1)
	const two = matcher(2)
}).types([98902, "instantiations"])

bench("match.only<T>", () => {
	const matcher = match
		.only<string | number | boolean>()
		.when("string", s => s)
		.when("number", n => n)
		.when("boolean", b => b)
		.finalize()

	const a = matcher("abc")
	const b = matcher(4)
	const c = matcher(true)
}).types([37333, "instantiations"])
