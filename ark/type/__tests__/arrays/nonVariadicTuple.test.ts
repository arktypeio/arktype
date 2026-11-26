import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("empty", () => {
		const T = type([])
		attest<[]>(T.infer)
		attest(T.expression).snap("[]")
		attest(T.json).snap({ proto: "Array", exactLength: 0 })
		attest(T([])).equals([])
		attest(T([1]).toString()).snap("must be empty")
	})

	it("empty string syntax", () => {
		const T = type("[]")
		attest<[]>(T.infer)
		attest(T.expression).snap("[]")
		attest(T.equals(type([]))).equals(true)
		attest(T([1]).toString()).snap("must be empty")
	})

	it("empty in an expression", () => {
		const T = type("[][] | 'a'")
		attest<[][] | "a">(T.infer)
		attest(T.expression).snap('[][] | "a"')
		attest(T([[]])).equals([[]])
		attest(T([[1]]).toString()).snap("[0] must be empty")
		// @ts-expect-error
		attest(() => type("[1]")).throws("Expected an expression before '[1]'")
	})

	it("shallow", () => {
		const T = type(["string", "number"])
		attest<[string, number]>(T.infer)
		attest(T.allows(["", 0])).equals(true)
		attest(T(["", 0])).snap(["", 0])
		attest(T.allows([true, 0])).equals(false)
		attest(T([true, 0]).toString()).snap("[0] must be a string")
		attest(T.allows([0, false])).equals(false)
		attest(T([0, false]).toString()).snap(`[0] must be a string
[1] must be a number`)
		// too short
		attest(T.allows([""])).equals(false)
		attest(T([""]).toString()).snap("must be exactly 2 items")
		// too long
		attest(T.allows(["", 0, 1])).equals(false)
		attest(T(["", 0, 1]).toString()).snap("must be exactly 2 items")
		// non-array
		attest(
			T.allows({
				length: 2,
				0: "",
				1: 0
			})
		).equals(false)
		attest(
			T({
				length: 2,
				0: "",
				1: 0
			}).toString()
		).snap("must be an array")
	})

	it("nested", () => {
		const T = type([["string", "number"], [{ a: "bigint", b: ["null"] }]])
		attest<
			[
				[string, number],
				[
					{
						a: bigint
						b: [null]
					}
				]
			]
		>(T.infer)
		const valid: typeof T.infer = [["", 0], [{ a: 0n, b: [null] }]]
		attest(T.allows(valid)).equals(true)
		attest(T(valid)).equals(valid)
		const invalid = [["", 0], [{ a: 0n, b: [undefined] }]]
		attest(T.allows(invalid)).equals(false)
		attest(T(invalid).toString()).snap("[1][0].b[0] must be null")
	})

	it("optional tuple", () => {
		const T = type([["string", "?"]])
		attest<[string?]>(T.infer)
		attest(T([])).equals([])
		attest(T(["foo"])).equals(["foo"])
		attest(T([5]).toString()).snap("[0] must be a string")
		attest(T(["foo", "bar"]).toString()).snap("must be at most 1 item")
	})

	it("optional element without exactOptionalPropertyTypes", () => {
		const loose = scope({}, { exactOptionalPropertyTypes: false })
		const T = loose.type(["string", "number?"])
		attest<[string, number?]>(T.infer)
		attest(T.expression).snap("[string, (number | undefined)?]")
		attest(T(["a", undefined]) as object).equals(["a", undefined])
		attest(T(["a", "b"]).toString()).snap("[1] must be a number or undefined")
		// as TS's Required does, it drops the undefined an optional element allowed
		attest(T.required().expression).snap("[string, number]")
		// an element in an intersection allows undefined only where both do
		const Exact = type(["string", "number?"])
		attest([T.and(Exact), Exact.and(T)].map(t => t.expression)).equals([
			"[string, number?]",
			"[string, number?]"
		])
		attest([Exact.extends(T), T.extends(Exact)]).equals([true, false])
	})

	it("optional string-embedded tuple", () => {
		const T = type(["string?"])

		const Expected = type([["string", "?"]])
		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("optional object tuple", () => {
		const T = type([[{ foo: "string" }, "?"], "string?"])
		attest<
			[
				{
					foo: string
				}?,
				string?
			]
		>(T.t)
		attest(T.expression).snap("[{ foo: string }?, string?]")
	})

	it("optional nested object tuple", () => {
		const T = type([[[{ foo: "string" }, "?"]], ["string", "?"]])
		attest<
			[
				[
					{
						foo: string
					}?
				],
				string?
			]
		>(T.t)
		attest(T.expression).snap("[[{ foo: string }?], string?]")
	})
})
