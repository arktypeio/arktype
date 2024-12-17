import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { defaultablePostOptionalMessage } from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	it("single element tuple", () => {
		const t = type([["number", "=", 5]])
		attest(t.t).type.toString.snap("[Default<number, 5>]")
		attest(t.expression).snap("[number?]")
		attest(t.json).snap({
			sequence: { defaults: [5], optionals: ["number"] },
			proto: "Array",
			maxLength: 1
		})
		attest(t([])).equals([5])
		attest(t([1])).equals([1])
		attest(t([null]).toString()).snap()
		attest(t([1, 2]).toString()).snap()
	})

	it("string", () => {
		const t = type(["string = 'foo'"])
		attest(t.t).type.toString.snap(`[Default<string, "foo">]`)
		attest(t.expression).snap()
		attest(t.json).snap()
		attest(t([])).equals(["foo"])
		attest(t(["bar"])).snap()
		attest(t([false]).toString()).snap()
		attest(t(["foo", "bar"]).toString()).snap()
	})

	it("defaults following prefix", () => {
		const t = type(["string", "number = 5"])
		attest(t.t).type.toString.snap("[Default<string, 5>, number]")
		attest(t.expression).snap()
		attest(t.json).snap()
		attest(t([""])).equals(["", 5])
		attest(t(["", 7])).equals(["", 7])

		attest(t([]).toString()).snap()
		attest(t(["foo", "bar"]).toString()).snap()
	})

	it("defaults preceding variadic", () => {
		const t = type(["number", "string = 'foo'", "...", "number[]"])
		attest(t.t).type.toString.snap("[Default<string, 'foo'>, ...number[]]")
		attest(t.expression).snap()
		attest(t.json).snap()

		attest(t([5])).equals([5, "foo"])
		attest(t([7, "bar"])).equals([7, "bar"])
		attest(t([8, "bar", 5])).equals([8, "bar", 5])

		attest(t([]).toString()).snap()
		// all positional elements including optionals
		// must be specified before variadic elements
		attest(t([5, 5]).toString()).snap()
	})

	it("default after undefaulted optional", () => {
		// @ts-expect-error
		attest(() => type(["number?", "number = 5"])).throwsAndHasTypeError(
			defaultablePostOptionalMessage
		)
	})
})
