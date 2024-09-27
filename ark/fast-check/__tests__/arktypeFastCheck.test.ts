import { arkToArbitrary } from "@ark/fast-check/internal/arktypeFastCheck.ts"
import { ArkErrors, type BaseRoot } from "@ark/schema"
import { scope, type } from "arktype"
import { assert, property } from "fast-check"
import { describe, it } from "mocha"

const ss = {
	user: {
		name: "string",
		"friend?": "user[]"
	},
	group: {
		title: "string",
		members: "user[]",
		isActive: "boolean|undefined"
	}
} as const

describe("Arbitrary Generation", () => {
	const s = Symbol()
	const ArkTypeTypes: Record<string, BaseRoot> = {
		// number
		number: type("number"),
		boundedNumberNonInclusive: type("number < 5"),
		boundedDouble: type("number <= 5.1"),
		doubleBoundedNumber: type("5<=number<10"),
		divisible: type("number%2"),
		// string
		string: type("string"),
		boundedStringNonInclusive: type("string<4"),
		boundedStringInclusive: type("string>=5"),
		doubleBoundedString: type("1<string<=5"),
		//regex
		email: type("string.email"),
		lowercase: type("string.lower"),
		// union
		numOrString: type("number|string"),
		integer: type("number.integer"),
		//object
		emptyObject: type({}),
		object: type("object"),
		objectWithOptional: type({ a: "string", "b?": "3<number<5" }),
		nestedObject: type({
			a: {
				b: "string < 2"
			}
		}),
		objectIntersection: type([{ a: "string" }, "&", { b: "number" }]),
		//array
		stringArr: type("string[]"),
		boundedStringArr: type("1 < string[] < 5"),
		arrOfArrs: type("string[][]"),
		numberArr: type("number[]"),
		unionArr: type("(string|number)[]"),
		emptyTuple: type([]),
		tuple: type(["string", "number", "string<5"]),
		nestedTuple: type(["string", ["string", "number"], "number"]),
		variadicTuple: type(["string", "...", "number[]", "string"]),
		morph: type(["string<5", "=>", val => `${val}`]),
		//boolean
		boolean: type("boolean"),
		falsebool: type("false"),
		truebool: type("true"),
		//literal
		exactNumber: type("number == 0.5"),
		exactLiteral: type("0.5"),
		stringLiteral: type("'hello'"),
		union: type({
			tag: "'admin'",
			"powers?": "string[]"
		})
			.or({
				tag: "'superadmin'",
				"superpowers?": "string[]"
			})
			.or({
				tag: "'pleb'"
			}) as any,
		symbol: type({
			[s]: "string"
		}),
		symbolType: type("symbol"),
		indexsig: type({ "[string]": "number|string" }),
		symbolIndexsig: type({ "[symbol]": "number|string" }),
		extraPropsOnArr: type({ name: "string" }).and("string[]") as any,
		date: type("Date"),
		boundedDate: type("d'2001/10/10'<Date<=d'2005/10/10'"),
		containsAlias: scope(ss).type("user"),
		Set: type("Set"),
		bigInt: type("bigint"),
		bigIntLiteral: type("19n")
	}
	for (const [name, schema] of Object.entries(ArkTypeTypes)) {
		it(name, () => {
			const arbitrary = arkToArbitrary(schema)
			return assert(
				property(arbitrary, value => {
					const result = schema(value)
					return !(result instanceof ArkErrors)
				})
			)
		})
	}
})
