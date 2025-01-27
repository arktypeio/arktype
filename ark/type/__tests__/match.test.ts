import { attest } from "@ark/attest"
import { match, scope } from "arktype"

it("cases only", () => {
	const sizeOf = match({
		"string|Array": v => v.length,
		number: v => v,
		bigint: v => v
	}).orThrow()

	attest<number>(sizeOf("abc")).equals(3)
	attest<number>(sizeOf([1, 2, 3])).equals(3)
	attest<bigint>(sizeOf(5n)).equals(5n)
})

it("properly infers types of inputs/outputs", () => {
	const matcher = match({ string: s => s, number: n => n })
		.when("boolean", b => b)
		.orThrow()

	// properly infers the type of the output based on the input
	attest<string>(matcher("abc")).equals("abc")
	attest<number>(matcher(4)).equals(4)
	attest<boolean>(matcher(true)).equals(true)

	// and properly handles unions in the input type
	attest<string | number>(matcher(0 as string | number))
})

describe('"finalizations"', () => {
	it(".orThrow()", () => {
		const matcher = match()
			.when("string", s => s)
			.orThrow()

		// properly returns the `never` type and throws given a guaranteed-to-be-invalid input
		attest<never>(matcher(4))

		attest(() => matcher(4)).throws("FAIL NEEDS ERROR")
	})

	describe(".default", () => {
		it("chained, given a callback", () => {
			const matcher = match()
				.when("string", s => s)
				.default(_ => 0)

			attest<string>(matcher("abc")).equals("abc")
			attest<number>(matcher(4)).equals(0)

			attest<string | number>(matcher(0 as unknown))
		})

		it("chained, given a value", () => {
			const matcher = match()
				.when("string", s => s)
				.default(0)

			attest<string>(matcher("abc")).equals("abc")
			attest<number>(matcher(4)).equals(0)

			attest<string | number>(matcher(0 as unknown))
		})

		it("in `cases`, given a callback", () => {
			const matcher = match({ string: s => s, default: _ => 0 })

			attest<string>(matcher("abc")).equals("abc")
			attest<number>(matcher(4)).equals(0)

			attest<string | number>(matcher(0 as unknown))
		})
	})

	it("errors when attempting to `.orThrow()` a non-exhaustive matcher", () => {
		const matcher = match().when("string", s => s)

		// @ts-expect-error
		attest(() => matcher.orThrow()).throwsAndHasTypeError(
			"Cannot manually finalize a non-exhaustive matcher: consider adding a `.default` case, using one of the `.orX` methods, or using `match.from<T>`"
		)
	})

	it("considers `unknown` exhaustive", () => {
		const matcher = match()
			.when("unknown", x => x)
			.orThrow()

		attest(matcher(4)).equals(4)
	})
})

describe(".from<T>", () => {
	it("does not accept invalid inputs at a type-level", () => {
		const matcher = match
			.from<string | number>()
			.when("string", s => s)
			.when("number", n => n)
			.orThrow()

		// @ts-expect-error
		attest(() => matcher(true)).throwsAndHasTypeError(
			"Argument of type 'true' is not assignable to parameter of type 'string | number'"
		)
	})

	it("allows finalizing exhaustive matchers", _ => {
		const matcher = match
			.from<string | number>()
			.when("string", s => s)
			.when("number", n => n)
			.orThrow()

		attest<string>(matcher("abc")).equals("abc")
		attest<number>(matcher(4)).equals(4)

		attest<string | number>(matcher(0 as string | number))
	})

	it("infers the parameter to chained .default as the remaining cases", () => {
		const matcher = match
			.from<string | number | boolean>()
			.when("string", s => s)
			.default(n => {
				attest<number | boolean>(n)
				return n
			})

		// for assertions
		matcher(4)
	})

	it("infers the parameter to in-cases .default", () => {
		const matcher = match.from<string | number | boolean>().cases({
			string: s => s,
			default: n => {
				// TS doesn't understand sequentiality in cases, so it's inferred as the in-type
				attest<string | number | boolean>(n)
				return n
			}
		})

		// for assertions
		matcher(4)
	})

	it("returns `never` on only the specific cases handled by `.orThrow`", () => {
		const matcher = match
			.from<string | number>()
			.when("string", s => s)
			.orThrow()

		attest<never>(matcher(4))
	})
})

it("within scope", () => {
	const threeSixtyNoScope = scope({ three: "3", sixty: "60", no: "'no'" })

	const matcher = threeSixtyNoScope
		.match({
			three: three => {
				attest<3>(three)
				return 3
			}
		})
		.when("sixty", sixty => {
			attest<60>(sixty)
			return 60
		})
		.orThrow()

	// for assertions
	matcher(3)
	matcher(60)
})

it("properly propagates errors from invalid type definitions in `when`", () => {
	// @ts-expect-error
	attest(() => match().when("strong", s => s)).type.errors(
		"'strong' is unresolvable"
	)
})

it("properly propagates errors from invalid type definitions in `cases`", () => {
	// @ts-expect-error
	attest(() => match({ strong: s => s })).type.errors(
		"'strong' is unresolvable"
	)
})
