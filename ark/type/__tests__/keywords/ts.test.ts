import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	schema,
	writeIndivisibleMessage,
	writeInvalidKeysMessage,
	writeNonStructuralOperandMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { ark, scope, type } from "arktype"

contextualize(() => {
	it("string strings", () => {
		/**
		 * 	In honor of @ark-expect-beta aka log(n):
		 * 		- Zirco author https://github.com/zirco-lang/zrc
		 * 		- Shameless Rust stan
		 * 		- Occasional user of ArkType libraries
		 * 		- Frequent user of ArkType Discord
		 * 		- Universally renowned two-finger speed typist
		 */
		const string = type("string")
		attest<string>(string.infer)
		attest(string("string")).snap("string")
	})

	it("any", () => {
		const any = type("unknown.any")
		// equivalent to unknown at runtime
		attest(any.json).equals(type.unknown.json)
		// inferred as any
		attest<any>(any.infer)
	})

	it("any in expression", () => {
		const t = type("string", "&", "unknown.any")
		attest<any>(t.infer)
		attest(t.json).equals(intrinsic.string.json)
	})

	it("boolean", () => {
		const boolean = type("boolean")
		attest<boolean>(boolean.infer)
		const expected = schema([{ unit: false }, { unit: true }])
		// should be simplified to simple checks for true and false literals
		attest(boolean.json).equals(expected.json)
	})

	it("never", () => {
		const never = type("never")
		attest<never>(never.infer)
		const expected = schema([])
		// should be equivalent to a zero-branch union
		attest(never.json).equals(expected.json)
	})

	it("never in union", () => {
		const t = type("string|never")
		attest<string>(t.infer)
		attest(t.json).equals(intrinsic.string.json)
	})

	it("unknown", () => {
		const expected = schema({})
		// should be equivalent to an unconstrained predicate
		attest(type("unknown").json).equals(expected.json)
	})

	describe("record", () => {
		it("parsed", () => {
			const expected = type({ "[string]": "number" })

			const expression = type("Record<string, number>")
			attest(expression.json).equals(expected.json)
			attest<typeof expected.t>(expression.t)
		})

		it("invoked", () => {
			const expected = type({ "[string]": "number" })

			const t = ark.Record("string", "number")

			attest(t.json).equals(expected.json)
			attest<typeof expected.t>(t.t)
		})

		it("invoked validation error", () => {
			// @ts-expect-error
			attest(() => ark.Record("string", "string % 2")).throwsAndHasTypeError(
				writeIndivisibleMessage(intrinsic.string)
			)
		})

		it("invoked constraint error", () => {
			// @ts-expect-error
			attest(() => ark.Record("boolean", "number"))
				.throws(
					writeUnsatisfiedParameterConstraintMessage(
						"K",
						"string | symbol",
						"boolean"
					)
				)
				.type.errors(`ErrorType<"Invalid argument for K", [expected: Key]>`)
		})
	})

	describe("pick", () => {
		it("parsed", () => {
			const types = scope({
				from: {
					foo: "1",
					"bar?": "1",
					baz: "1",
					"quux?": "1"
				},
				actual: "Pick<from, 'foo' | 'bar'>",
				expected: {
					foo: "1",
					"bar?": "1"
				}
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const user = type({
				name: "string",
				"age?": "number",
				isAdmin: "boolean"
			})

			const basicUser = user.pick("name", "age")

			const expected = type({
				name: "string",
				"age?": "number"
			})

			attest<typeof expected.t>(basicUser.t)

			attest(basicUser.expression).equals(expected.expression)
		})

		it("invalid key", () => {
			const user = type({
				name: "string"
			})

			// @ts-expect-error
			attest(() => user.pick("length"))
				.throws(writeInvalidKeysMessage(user.expression, ["length"]))
				.type.errors.snap(
					'Argument of type \'"length"\' is not assignable to parameter of type \'"name" | cast<"name">\'.'
				)
		})

		it("non-structure", () => {
			// @ts-expect-error
			attest(() => type("string").pick("length"))
				.throws(writeNonStructuralOperandMessage("pick", "string"))
				.type.errors("Property 'pick' does not exist")
		})
	})

	describe("omit", () => {
		it("parsed", () => {
			const types = scope({
				from: {
					foo: "1",
					"bar?": "1",
					baz: "1",
					"quux?": "1"
				},
				actual: "Omit<from, 'foo' | 'bar'>",
				expected: {
					baz: "1",
					"quux?": "1"
				}
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const user = type({
				name: "string",
				"age?": "number",
				isAdmin: "boolean",
				"isActive?": "boolean"
			})

			const extras = user.omit("name", "age")

			const expected = type({
				isAdmin: "boolean",
				"isActive?": "boolean"
			})

			attest<typeof expected.t>(extras.t)

			attest(extras.expression).equals(expected.expression)
		})
	})

	describe("partial", () => {
		it("parsed", () => {
			const types = scope({
				user: {
					name: "string",
					"age?": "number"
				},
				actual: "Partial<user>",
				expected: {
					"name?": "string",
					"age?": "number"
				}
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const t = type({
				"[string]": "number",
				foo: "1",
				"bar?": "1"
			}).partial()

			attest<{
				// really this should just be number for the index signature, seems like a TS bug?
				[x: string]: number | undefined
				foo?: 1
				bar?: 1
			}>(t.t)

			attest(t.expression).snap("{ [string]: number, bar?: 1, foo?: 1 }")
		})
	})

	describe("required", () => {
		it("parsed", () => {
			const types = scope({
				user: {
					name: "string",
					"age?": "number"
				},
				actual: "Required<user>",
				expected: {
					name: "string",
					age: "number"
				}
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const t = type({
				"[string]": "number",
				foo: "1",
				"bar?": "1"
			}).required()

			attest<{
				[x: string]: number
				foo: 1
				bar: 1
			}>(t.t)

			attest(t.expression).snap("{ [string]: number, bar: 1, foo: 1 }")
		})
	})

	describe("extract", () => {
		it("parsed", () => {
			const types = scope({
				from: "0 | 1",
				actual: "Extract<from, 1>",
				expected: "1"
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const extracted = type("true | 0 | 'foo'").extract("boolean | number")

			const expected = type("true | 0")

			attest<typeof expected.t>(extracted.t)

			attest(extracted.expression).equals(expected.expression)
		})
	})

	describe("exclude", () => {
		it("parsed", () => {
			const types = scope({
				from: "0 | 1",
				actual: "Exclude<from, 1>",
				expected: "0"
			}).export()

			attest<typeof types.expected.t>(types.actual.t)
			attest(types.actual.expression).equals(types.expected.expression)
		})

		it("chained", () => {
			const extracted = type("true | 0 | 'foo'").exclude("string")

			const expected = type("true | 0")

			attest<typeof expected.t>(extracted.t)

			attest(extracted.expression).equals(expected.expression)
		})
	})
})
