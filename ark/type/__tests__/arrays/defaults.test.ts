import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { defaultablePostOptionalMessage } from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	it("single element tuple", () => {
		const T = type([["number", "=", 5]])
		attest(T.t).type.toString.snap("[Default<number, 5>]")
		attest(T.expression).snap("[number = 5]")
		attest(T.json).snap({
			sequence: { defaultables: [["number", 5]] },
			proto: "Array",
			maxLength: 1
		})
		attest(T([])).equals([5])
		attest(T([1])).equals([1])
		attest(T([null]).toString()).snap("[0] must be a number")
		attest(T([1, 2]).toString()).snap("must be at most 1 item")
	})

	it("string", () => {
		const T = type(["string = 'foo'"])
		attest(T.t).type.toString.snap(`[Default<string, "foo">]`)
		attest(T.expression).snap('[string = "foo"]')
		attest(T.json).snap({
			sequence: { defaultables: [["string", "foo"]] },
			proto: "Array",
			maxLength: 1
		})
		attest(T([])).equals(["foo"])
		attest(T(["bar"])).snap(["bar"])
		attest(T([false]).toString()).snap("[0] must be a string")
		attest(T(["foo", "bar"]).toString()).snap("must be at most 1 item")
	})

	it("defaults following prefix", () => {
		const T = type(["string", "number = 5"])
		attest(T.t).type.toString.snap("[string, Default<number, 5>]")
		attest(T.expression).snap("[string, number = 5]")
		attest(T.json).snap({
			sequence: { defaultables: [["number", 5]], prefix: ["string"] },
			proto: "Array",
			maxLength: 2,
			minLength: 1
		})
		attest(T([""])).equals(["", 5])
		attest(T(["", 7])).equals(["", 7])

		attest(T([]).toString()).snap("must be non-empty")
		attest(T(["foo", "bar"]).toString()).snap("[1] must be a number")
	})

	it("defaults preceding variadic", () => {
		const T = type(["number", "string = 'foo'", "...", "number[]"])
		attest(T.t).type.toString.snap(
			'[number, Default<string, "foo">, ...number[]]'
		)
		attest(T.expression).snap('[number, string = "foo", ...number[]]')
		attest(T.json).snap({
			sequence: {
				defaultables: [["string", "foo"]],
				prefix: ["number"],
				variadic: "number"
			},
			proto: "Array",
			minLength: 1
		})

		attest(T([5])).equals([5, "foo"])
		attest(T([7, "bar"])).equals([7, "bar"])
		attest(T([8, "bar", 5])).equals([8, "bar", 5])

		attest(T([]).toString()).snap("must be non-empty")
		// all positional elements including optionals
		// must be specified before variadic elements
		attest(T([5, 5]).toString()).snap("[1] must be a string")
	})

	it("empty array default in tuple literal", () => {
		const T = type(["string[] = []"])
		attest(T.t).type.toString.snap("[Default<string[], []>]")
		attest(T([])).equals([[]]) // outer is the tuple, inner is the defaulted array
		attest(T([["a"]])).equals([["a"]])
	})

	it("default after undefaulted optional", () => {
		// @ts-expect-error
		attest(() => type(["number?", "number = 5"])).throwsAndHasTypeError(
			defaultablePostOptionalMessage
		)
	})

	it("input extracted as optional", () => {
		const T = type(["number = 5"])
		attest<[number?]>(T.in.t)
		attest<[number?]>(T.inferIn)

		attest(T.in.expression).snap("[number?]")
	})

	it("defaulted morph element is optional in inferIn", () => {
		const T = type(["string", ["string.numeric.parse", "=", "10"]])
		attest<[string, string?]>(T.inferIn)
		attest<[string, number]>(T.inferOut)
		attest(T(["hi"])).equals(["hi", 10])
		attest(T(["hi", "25"])).equals(["hi", 25])
	})

	it("output extracted as required", () => {
		const T = type(["number = 5"])
		attest<[number]>(T.out.t)
		attest<[number]>(T.inferOut)

		attest(T.out.expression).snap("[number]")
	})

	it("input and output keep surrounding elements", () => {
		const T = type(["string", "number = 5", "boolean?"])

		attest<[string, number?, boolean?]>(T.in.t)
		attest(T.in.expression).snap("[string, number?, boolean?]")
		attest(T.in.allows(["", 5, true])).equals(true)
		attest(T.in.allows(["", true])).equals(false)

		attest<[string, number, boolean?]>(T.out.t)
		attest(T.out.expression).snap("[string, number, boolean?]")
		attest(T.out.allows(["", 5])).equals(true)
		attest(T.out.allows([""])).equals(false)
	})

	it("output keeps prefix preceding variadic", () => {
		const T = type(["number", "string = 'foo'", "...", "number[]"])

		attest(T.in.expression).snap("[number, string?, ...number[]]")
		attest(T.out.expression).snap("[number, string, ...number[]]")
	})

	it("compiled defaults use correct values", () => {
		const T = type(["string = 'foo'"])

		attest(T([])).equals(["foo"])
	})

	it("spread preserves defaulted elements", () => {
		const Inner = type(["string", "number = 0"])
		const T = type(["boolean", "...", Inner])
		attest(T.t).type.toString.snap("[boolean, string, Default<number, 0>]")
		attest(T.expression).snap("[boolean, string, number = 0]")
		attest(T([true, "hi"])).equals([true, "hi", 0])
		attest(T([true, "hi", 5])).equals([true, "hi", 5])
		attest(T([true, "hi", "bad"]).toString()).snap("[2] must be a number")
		attest(T([true, "hi", 5, 6]).toString()).snap("must be at most 3 items")

		const WithOptional = type([
			"boolean",
			"...",
			type(["string", "number = 0", "boolean?"])
		])
		attest(WithOptional.expression).snap(
			"[boolean, string, number = 0, boolean?]"
		)
		attest(WithOptional([true, "hi"])).equals([true, "hi", 0])
		attest(WithOptional([true, "hi", 2, false])).equals([true, "hi", 2, false])

		attest(() => type(["string?", "...", type(["number = 0"])])).throws(
			defaultablePostOptionalMessage
		)
	})

	describe("without exactOptionalPropertyTypes", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { exactOptionalPropertyTypes: false, jitless })

			it(`replaces an undefined element${jitless ? " jitless" : ""}`, () => {
				const T = $.type(["string", "number = 5", "boolean = true"])
				attest(T.expression).snap(
					"[string, (number | undefined) = 5, (undefined | false | true) = true]"
				)
				attest(T(["a", undefined] as never)).equals(["a", 5, true])
				attest(T(["a", 1, undefined] as never)).equals(["a", 1, true])
				attest(T(["a"])).equals(["a", 5, true])
				attest(T.out.expression).snap("[string, number, boolean]")
				attest(T.required().expression).snap("[string, number, boolean]")
			})

			it(`doesn't transform an undefined its default replaces${jitless ? " jitless" : ""}`, () => {
				const inputs: unknown[] = []
				const Length = type("string | undefined").pipe(s => {
					inputs.push(s)
					return s?.length ?? -1
				})
				const T = $.type(["string", [Length, "=", "xx"]])
				attest(T(["a", undefined] as never)).equals(["a", 2])
				attest(inputs).equals(["xx"])
			})
		}

		it("a default can't be the undefined it replaces", () => {
			attest(() =>
				scope({}, { exactOptionalPropertyTypes: false }).type([
					"string",
					["number", "=", undefined as never]
				])
			).throws.snap("ParseError: Default must be a number")
		})
	})
})
