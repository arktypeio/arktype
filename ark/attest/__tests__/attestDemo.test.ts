// import { attest, getTsVersionUnderTest } from "@arktype/attest"
// import { type } from "arktype"

// // @arktype/attest assertions can be made from any unit test framework with a global setup/teardown
// describe("attest features", () => {
// 	it("type and value assertions", () => {
// 		const even = type("number%2")
// 		// asserts even.infer is exactly number
// 		attest<number>(even.infer)
// 		// make assertions about types and values seamlessly
// 		attest(even.infer).type.toString.snap("number")
// 		// including object literals- no more long inline strings!
// 		attest(even.json).snap({ basis: "number", divisor: 2 })
// 	})

// 	it("error assertions", () => {
// 		// Check type errors, runtime errors, or both at the same time!
// 		// @ts-expect-error
// 		attest(() => type("number%0")).throwsAndHasTypeError(
// 			"% operator must be followed by a non-zero integer literal (was 0)"
// 		)
// 		// @ts-expect-error
// 		attest(() => type({ "[object]": "string" })).type.errors(
// 			"Indexed key definition 'object' must be a string, number or symbol"
// 		)
// 	})

// 	it("integrate runtime logic with type assertions", () => {
// 		const arrayOf = type("<t>", "t[]")
// 		const numericArray = arrayOf("number | bigint")
// 		// flexibly combine runtime logic with type assertions to customize your
// 		// tests beyond what is possible from pure static-analysis based type testing tools
// 		if (getTsVersionUnderTest().startsWith("5")) {
// 			// this assertion will only occur when testing TypeScript 5+!
// 			attest<(number | bigint)[]>(numericArray.infer)
// 		}
// 	})
// })
