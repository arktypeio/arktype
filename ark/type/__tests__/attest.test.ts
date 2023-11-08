import { attest, getTsVersionUnderTest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"

// @arktype/attest assertions can be made from any unit test framework with a global setup/teardown
suite("attest features", () => {
	test("type and value assertions", () => {
		const even = type("number%2")
		// asserts even.infer is exactly number
		attest<number>(even.infer)
		// can also test the string representation of types
		attest(even.infer).type.toString.snap("string")
		// also includes inline object-literal snapshotting
		attest(even.json).snap({
			intersection: [{ domain: "number" }, { divisor: 2 }]
		})
	})

	test("error assertions", () => {
		// Make assertions about type errors, runtime errors, or both at the same time!
		// @ts-expect-error
		attest(() => type("number%0")).throwsAndHasTypeError(
			"% operator must be followed by a non-zero integer literal (was 0)"
		)
	})

	test("integrate runtime logic with type assertions", () => {
		const arrayOf = type("<t>", "t[]")
		const numericArray = arrayOf("number | bigint") //=>?
		// flexibly combine runtime logic with type assertions to customize your
		// tests beyond what is possible from pure static-analysis based type testing tools
		if (getTsVersionUnderTest().startsWith("5")) {
			// this assertion will only occur when testing TypeScript 5+!
			attest<(number | bigint)[]>(numericArray.infer)
		}
	})
})
