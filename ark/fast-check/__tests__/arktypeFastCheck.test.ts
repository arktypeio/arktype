import { attest } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check/internal/arktypeFastCheck.ts"
import { scope, type } from "arktype"
import { type Arbitrary, assert, property } from "fast-check"
import { describe } from "mocha"

describe("Arbitrary Generation", () => {
	describe("union", () => {
		it("boolean", () => {
			const t = type("boolean")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("number|string", () => {
			const t = type("number|string")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
	})
	describe("number", () => {
		it("number", () => {
			const t = type("number")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("Tight Bound", () => {
			const t = type("4<number<5")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("Integer", () => {
			const t = type("number.integer")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("Invalid Bound", () => {
			const t = type("4<number.integer<5")
			attest(() => assertProperty(arkToArbitrary(t), t)).throws(
				"No integer value satisfies >5 & <4"
			)
		})
		it("equals", () => {
			const t = type("number==2")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("divisible", () => {
			const t = type("number%2")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("large divisor", () => {
			const t = type("number%7654321001>1")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("divisible within range", () => {
			const t = type("15<number%7<39")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("non-divisible within range", () => {
			const t = type("52<number%10<58")
			attest(() => arkToArbitrary(t)).throws(
				"No values within range 53 - 57 are divisible by 10."
			)
		})
	})
	describe("string", () => {
		it("string", () => {
			const t = type("string")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("bounded string", () => {
			const t = type("string < 5")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("double bounded string", () => {
			const t = type("3<string <= 8")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("regex", () => {
			const t = type("string.email")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("multiple regexes", () => {
			const t = type("string.email").and("string.alpha")
			attest(() => arkToArbitrary(t)).throws(
				"Multiple regexes on a single node is not supported."
			)
		})
		it("bounded regex", () => {
			const t = type("string.email<5")
			attest(() => arkToArbitrary(t)).throws("Bounded regex is not supported.")
		})
	})
	describe("misc", () => {
		it("unknown", () => {
			const t = type("unknown")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("unknown[]", () => {
			const t = type("unknown[]")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("bigint", () => {
			const t = type("bigint")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("symbol", () => {
			const t = type("symbol")
			const arbitrary = arkToArbitrary(t)
			return assertProperty(arbitrary, t)
		})
		it("false", () => {
			const t = type("false")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("true", () => {
			const t = type("true")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("literal number", () => {
			const t = type("0.5")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("literal string", () => {
			const t = type("'hello'")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("morph", () => {
			const t = type(["string<5", "=>", val => `${val}`])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
	})

	describe("array", () => {
		it("Array keyword", () => {
			const t = type("Array")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("constrained Array keyword", () => {
			const t = type("Array<2")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("string[]", () => {
			const t = type("string[]")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("number[][]", () => {
			const t = type("number[][]")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("bounded array", () => {
			const t = type("3<number[]<=5")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("union array", () => {
			const t = type("(string|number)[]")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
	})
	describe("tuple", () => {
		it("empty tuple", () => {
			const t = type([])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("one element tuple", () => {
			const t = type(["string"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("two element tuple", () => {
			const t = type(["string", "number"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})

		it("just variadic", () => {
			const t = type(["...", "string[]"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("variadic", () => {
			const t = type(["number", "...", "string[]"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("one element optional tuple", () => {
			const t = type(["string?"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("tuple with optional", () => {
			const t = type(["number", "string>2?"])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
	})
	describe("object", () => {
		it("{}", () => {
			const t = type({})
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("object keyword", () => {
			const t = type("object")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("object with optional key", () => {
			const t = type({ a: "string", "b?": "3<number<5" })
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("nested object", () => {
			const t = type({
				a: {
					b: "string >= 2",
					"c?": "string"
				},
				"d?": "number"
			})
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("intersected object", () => {
			const t = type([{ a: "string" }, "&", { b: "number" }])
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("symbol key", () => {
			const s = Symbol()
			const t = type({
				[s]: "string"
			})
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("index signature", () => {
			const t = type({ "[string]": "number|string" })
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("multiple index signatures", () => {
			const t = type({
				"[string]": "number|string",
				"[symbol]": "string"
			})
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("symbol index signature", () => {
			const t = type({ "[symbol]": "number|string" })
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("contains alias", () => {
			const example = {
				user: {
					name: "string",
					friends: "user[]"
				}
			} as const
			const t = scope(example).type("user")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
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
			const t = type({ name: "string" }).and("unknown[]")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("array keyword with additional propss", () => {
			const t = type({ name: "string" }).and("Array<4")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("array with additional propss", () => {
			const t = type({ name: "string" }).and("string[]")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
	})
	describe("proto", () => {
		it("Set", () => {
			const t = type("Set")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("Date", () => {
			const t = type("Date")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
		})
		it("bounded date", () => {
			const t = type("d'2001/10/10'<Date<=d'2005/10/10'")
			const arbitrary = arkToArbitrary(t)
			assertProperty(arbitrary, t)
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
