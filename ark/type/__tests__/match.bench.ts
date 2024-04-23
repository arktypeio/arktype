import { bench } from "@arktype/attest"
import { match } from "arktype"

bench("general matchers", () => {
	const matcher = match()
		.when("string", s => s)
		.when("number", n => n)
		.when("boolean", b => b)
		.orThrow()

	const a = matcher("abc")
	const b = matcher(4)
	const c = matcher(true)
})
	.median()
	.types()

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
})
	.median()
	.types()
