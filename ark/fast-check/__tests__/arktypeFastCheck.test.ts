import { attest, contextualize } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check/internal/arktypeFastCheck.ts"
import { scope, type } from "arktype"
import { type Arbitrary, assert, property } from "fast-check"
import { describe } from "mocha"

contextualize(() => {
	describe("union", () => {
		it("boolean", () => {
			const T = type("boolean")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("number|string", () => {
			const T = type("number|string")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("number", () => {
		it("number", () => {
			const T = type("number")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("Tight Bound", () => {
			const T = type("4<number<5")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("Integer", () => {
			const T = type("number.integer")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("Invalid Bound", () => {
			const T = type("4<number.integer<5")
			attest(() => assertProperty(arkToArbitrary(T), T)).throws(
				"No integer value satisfies >5 & <4"
			)
		})
		it("equals", () => {
			const T = type("number==2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("divisible", () => {
			const T = type("number%2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("large divisor", () => {
			const T = type("number%7654321001>1")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("divisible within range", () => {
			const T = type("15<number%7<39")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("non-divisible within range", () => {
			const T = type("52<number%10<58")
			attest(() => arkToArbitrary(T)).throws(
				"No values within range 53 - 57 are divisible by 10."
			)
		})
	})

	describe("string", () => {
		it("string", () => {
			const T = type("string")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("bounded string", () => {
			const T = type("string < 5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("double bounded string", () => {
			const T = type("3<string <= 8")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("regex", () => {
			const T = type("string.email")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("multiple regexes", () => {
			const T = type("string.email").and("string.alpha")
			attest(() => arkToArbitrary(T)).throws(
				"Multiple regexes on a single node is not supported."
			)
		})
		it("bounded regex", () => {
			const T = type("string.email<5")
			attest(() => arkToArbitrary(T)).throws("Bounded regex is not supported.")
		})
	})

	describe("misc", () => {
		it("unknown", () => {
			const T = type("unknown")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("unknown[]", () => {
			const T = type("unknown[]")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("bigint", () => {
			const T = type("bigint")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("symbol", () => {
			const T = type("symbol")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("false", () => {
			const T = type("false")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("true", () => {
			const T = type("true")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("literal number", () => {
			const T = type("0.5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("literal string", () => {
			const T = type("'hello'")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("morph", () => {
			const T = type(["string<5", "=>", val => `${val}`])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("array", () => {
		it("Array keyword", () => {
			const T = type("Array")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("constrained Array keyword", () => {
			const T = type("Array<2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("string[]", () => {
			const T = type("string[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("number[][]", () => {
			const T = type("number[][]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("bounded array", () => {
			const T = type("3<number[]<=5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("union array", () => {
			const T = type("(string|number)[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("tuple", () => {
		it("empty tuple", () => {
			const T = type([])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("one element tuple", () => {
			const T = type(["string"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("two element tuple", () => {
			const T = type(["string", "number"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})

		it("just variadic", () => {
			const T = type(["...", "string[]"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("variadic", () => {
			const T = type(["number", "...", "string[]"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("one element optional tuple", () => {
			const T = type(["string?"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("tuple with optional", () => {
			const T = type(["number", "string>2?"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("object", () => {
		it("{}", () => {
			const T = type({})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("object keyword", () => {
			const T = type("object")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("object with optional key", () => {
			const T = type({ a: "string", "b?": "3<number<5" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("nested object", () => {
			const T = type({
				a: {
					b: "string >= 2",
					"c?": "string"
				},
				"d?": "number"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("intersected object", () => {
			const T = type([{ a: "string" }, "&", { b: "number" }])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("symbol key", () => {
			const s = Symbol()
			const T = type({
				[s]: "string"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("index signature", () => {
			const T = type({ "[string]": "number|string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("multiple index signatures", () => {
			const T = type({
				"[string]": "number|string",
				"[symbol]": "string"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("symbol index signature", () => {
			const T = type({ "[symbol]": "number|string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("contains alias", () => {
			const example = {
				user: {
					name: "string",
					friends: "user[]"
				}
			} as const
			const T = scope(example).type("user")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("cyclic", () => {
			const $ = scope({
				arf2: {
					b: "bork2"
				},
				bork2: {
					c: "arf2&bork2"
				}
			}).export()
			attest(() => arkToArbitrary($.arf2)).throws(
				"Infinitely deep cycles are not supported."
			)
		})
		it("unknown array with additional props", () => {
			const T = type({ name: "string" }).and("unknown[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("array keyword with additional propss", () => {
			const T = type({ name: "string" }).and("Array<4")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("array with additional propss", () => {
			const T = type({ name: "string" }).and("string[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("proto", () => {
		it("Set", () => {
			const T = type("Set")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("Date", () => {
			const T = type("Date")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("bounded date", () => {
			const T = type("d'2001/10/10'<Date<=d'2005/10/10'")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})
})

const assertProperty = (arbitrary: Arbitrary<unknown>, schema: type.Any) =>
	assert(
		property(arbitrary, value => {
			schema.assert(value)
			return true
		})
	)
