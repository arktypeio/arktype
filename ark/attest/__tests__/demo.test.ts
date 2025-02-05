import {
	attest,
	contextualize,
	getPrimaryTsVersionUnderTest
} from "@ark/attest"
import { type } from "arktype"

const o = { ark: "type" } as const
const shouldThrow = (a: false) => {
	if (a) throw new Error(`${a} is not assignable to false`)
}

contextualize(() => {
	it("value snap", () => {
		attest(o).snap({ ark: "type" })
	})

	it("type snap", () => {
		attest(o).type.toString.snap('{ readonly ark: "type" }')
	})

	it("type assertion", () => {
		attest<{ readonly ark: "type" }>(o)
	})

	it("type-only assertion", () => {
		attest<{ readonly ark: "type" }, typeof o>()
	})

	it("chained snaps", () => {
		attest(o)
			.snap({ ark: "type" })
			.type.toString.snap('{ readonly ark: "type" }')
	})

	it("error and type error snap", () => {
		// @ts-expect-error
		attest(() => shouldThrow(true))
			.throws.snap("Error: true is not assignable to false")
			.type.errors.snap(
				"Argument of type 'true' is not assignable to parameter of type 'false'."
			)
	})

	// @ark/attest assertions can be made from any unit test framework with a global setup/teardown

	it("type and value assertions", () => {
		const even = type("number%2")
		// snapshot types and values seamlessly
		attest(even.infer).type.toString.snap("number")
		// including object literals- no more long inline strings!
		attest(even.json).snap({ domain: "number", divisor: 2 })
	})

	it("error assertions", () => {
		// Check type errors, runtime errors, or both at the same time!
		// @ts-expect-error
		attest(() => type("number%0")).throwsAndHasTypeError(
			"% operator must be followed by a non-zero integer literal (was 0)"
		)
		// @ts-expect-error
		attest(() => type({ "[object]": "string" })).type.errors(
			"Indexed key definition 'object' must be a string or symbol"
		)
	})

	it("completion snapshotting", () => {
		// snapshot expected completions for any string literal!
		// @ts-expect-error (if your expression would throw, prepend () =>)
		attest(() => type({ b: "b" })).completions({
			b: ["bigint", "boolean"]
		})
		type Legends = { faker?: "🐐"; [others: string]: unknown }
		// works for keys or index access as well (may need prettier-ignore to
		// avoid removing quotes)
		// prettier-ignore
		attest({ "f": "🐐" } as Legends).completions({ f: ["faker"] })
	})

	it("integrate runtime logic with type assertions", () => {
		const arrayOf = type("<t>", "t[]")
		const numericArray = arrayOf("number | bigint")
		// flexibly combine runtime logic with type assertions to customize your
		// tests beyond what is possible from pure static-analysis based type testing tools
		if (getPrimaryTsVersionUnderTest().startsWith("5")) {
			// this assertion will only occur when testing TypeScript 5+!
			attest<(number | bigint)[]>(numericArray.infer)
		}
	})
})
