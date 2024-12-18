import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { defaultablePostOptionalMessage } from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	it("single element tuple", () => {
		const t = type([["number", "=", 5]])
		attest(t.t).type.toString.snap("[Default<number, 5>]")
		attest(t.expression).snap("[number = 5]")
		attest(t.json).snap({
			sequence: { defaultables: [["number", 5]] },
			proto: "Array",
			maxLength: 1
		})
		attest(t([])).equals([5])
		attest(t([1])).equals([1])
		attest(t([null]).toString()).snap(
			"value at [0] must be a number (was null)"
		)
		attest(t([1, 2]).toString()).snap("must be at most length 1 (was 2)")
	})

	it("string", () => {
		const t = type(["string = 'foo'"])
		attest(t.t).type.toString.snap(`[Default<string, "foo">]`)
		attest(t.expression).snap('[string = "foo"]')
		attest(t.json).snap({
			sequence: { defaultables: [["string", "foo"]] },
			proto: "Array",
			maxLength: 1
		})
		attest(t([])).equals(["foo"])
		attest(t(["bar"])).snap(["bar"])
		attest(t([false]).toString()).snap(
			"value at [0] must be a string (was boolean)"
		)
		attest(t(["foo", "bar"]).toString()).snap(
			"must be at most length 1 (was 2)"
		)
	})

	it("defaults following prefix", () => {
		const t = type(["string", "number = 5"])
		attest(t.t).type.toString.snap("[string, Default<number, 5>]")
		attest(t.expression).snap("[string, number = 5]")
		attest(t.json).snap({
			sequence: { defaultables: [["number", 5]], prefix: ["string"] },
			proto: "Array",
			maxLength: 2,
			minLength: 1
		})
		attest(t([""])).equals(["", 5])
		attest(t(["", 7])).equals(["", 7])

		attest(t([]).toString()).snap("must be non-empty")
		attest(t(["foo", "bar"]).toString()).snap(
			"value at [1] must be a number (was a string)"
		)
	})

	it("defaults preceding variadic", () => {
		const t = type(["number", "string = 'foo'", "...", "number[]"])
		attest(t.t).type.toString.snap(
			'[number, Default<string, "foo">, ...number[]]'
		)
		attest(t.expression).snap('[number, string = "foo", ...number[]]')
		attest(t.json).snap({
			sequence: {
				defaultables: [["string", "foo"]],
				prefix: ["number"],
				variadic: "number"
			},
			proto: "Array",
			minLength: 1
		})

		attest(t([5])).equals([5, "foo"])
		attest(t([7, "bar"])).equals([7, "bar"])
		attest(t([8, "bar", 5])).equals([8, "bar", 5])

		attest(t([]).toString()).snap("must be non-empty")
		// all positional elements including optionals
		// must be specified before variadic elements
		attest(t([5, 5]).toString()).snap(
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
