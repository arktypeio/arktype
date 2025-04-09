import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
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
		attest(T([null]).toString()).snap(
			"value at [0] must be a number (was null)"
		)
		attest(T([1, 2]).toString()).snap("must be at most length 1 (was 2)")
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
		attest(T([false]).toString()).snap(
			"value at [0] must be a string (was boolean)"
		)
		attest(T(["foo", "bar"]).toString()).snap(
			"must be at most length 1 (was 2)"
		)
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
		attest(T(["foo", "bar"]).toString()).snap(
			"value at [1] must be a number (was a string)"
		)
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
		attest(T([5, 5]).toString()).snap(
			"value at [1] must be a string (was a number)"
		)
	})

	it("default after undefaulted optional", () => {
		// @ts-expect-error
		attest(() => type(["number?", "number = 5"])).throwsAndHasTypeError(
			defaultablePostOptionalMessage
		)
	})
})
