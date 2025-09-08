import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("empty", () => {
		const T = type([])
		attest<[]>(T.infer)
		attest(T.expression).snap("[]")
		attest(T.json).snap({ proto: "Array", exactLength: 0 })
		attest(T([])).equals([])
		attest(T([1]).toString()).snap("must be exactly length 0 (was 1)")
	})

	it("shallow", () => {
		const T = type(["string", "number"])
		attest<[string, number]>(T.infer)
		attest(T.allows(["", 0])).equals(true)
		attest(T(["", 0])).snap(["", 0])
		attest(T.allows([true, 0])).equals(false)
		attest(T([true, 0]).toString()).snap(
			"value at [0] must be a string (was boolean)"
		)
		attest(T.allows([0, false])).equals(false)
		attest(T([0, false]).toString())
			.snap(`value at [0] must be a string (was a number)
value at [1] must be a number (was boolean)`)
		// too short
		attest(T.allows([""])).equals(false)
		attest(T([""]).toString()).snap("must be exactly length 2 (was 1)")
		// too long
		attest(T.allows(["", 0, 1])).equals(false)
		attest(T(["", 0, 1]).toString()).snap("must be exactly length 2 (was 3)")
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
		).snap("must be an array (was object)")
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
		attest(T(invalid).toString()).snap(
			"value at [1][0].b[0] must be null (was undefined)"
		)
	})

	it("optional tuple", () => {
		const T = type([["string", "?"]])
		attest<[string?]>(T.infer)
		attest(T([])).equals([])
		attest(T(["foo"])).equals(["foo"])
		attest(T([5]).toString()).snap(
			"value at [0] must be a string (was a number)"
		)
		attest(T(["foo", "bar"]).toString()).snap(
			"must be at most length 1 (was 2)"
		)
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
