import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("empty", () => {
		const t = type([])
		attest<[]>(t.infer)
		attest(t.expression).snap("[]")
		attest(t.json).snap({ proto: "Array", exactLength: 0 })
		attest(t([])).equals([])
		attest(t([1]).toString()).snap("must be exactly length 0 (was 1)")
	})

	it("shallow", () => {
		const t = type(["string", "number"])
		attest<[string, number]>(t.infer)
		attest(t.allows(["", 0])).equals(true)
		attest(t(["", 0])).snap(["", 0])
		attest(t.allows([true, 0])).equals(false)
		attest(t([true, 0]).toString()).snap(
			"value at [0] must be a string (was boolean)"
		)
		attest(t.allows([0, false])).equals(false)
		attest(t([0, false]).toString())
			.snap(`value at [0] must be a string (was a number)
value at [1] must be a number (was boolean)`)
		// too short
		attest(t.allows([""])).equals(false)
		attest(t([""]).toString()).snap("must be exactly length 2 (was 1)")
		// too long
		attest(t.allows(["", 0, 1])).equals(false)
		attest(t(["", 0, 1]).toString()).snap("must be exactly length 2 (was 3)")
		// non-array
		attest(
			t.allows({
				length: 2,
				0: "",
				1: 0
			})
		).equals(false)
		attest(
			t({
				length: 2,
				0: "",
				1: 0
			}).toString()
		).snap("must be an array (was object)")
	})

	it("nested", () => {
		const t = type([["string", "number"], [{ a: "bigint", b: ["null"] }]])
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
		>(t.infer)
		const valid: typeof t.infer = [["", 0], [{ a: 0n, b: [null] }]]
		attest(t.allows(valid)).equals(true)
		attest(t(valid)).equals(valid)
		const invalid = [["", 0], [{ a: 0n, b: [undefined] }]]
		attest(t.allows(invalid)).equals(false)
		attest(t(invalid).toString()).snap(
			"value at [1][0].b[0] must be null (was undefined)"
		)
	})

	it("optional tuple", () => {
		const t = type([["string", "?"]])
		attest<[string?]>(t.infer)
		attest(t([])).equals([])
		attest(t(["foo"])).equals(["foo"])
		attest(t([5]).toString()).snap(
			"value at [0] must be a string (was a number)"
		)
		attest(t(["foo", "bar"]).toString()).snap(
			"must be at most length 1 (was 2)"
		)
	})

	it("optional string-embedded tuple", () => {
		const t = type(["string?"])

		const expected = type([["string", "?"]])
		attest<typeof expected>(t)
		attest(t.expression).equals(expected.expression)
	})

	it("optional object tuple", () => {
		const t = type([[{ foo: "string" }, "?"], "string?"])
		attest<
			[
				{
					foo: string
				}?,
				string?
			]
		>(t.t)
		attest(t.expression).snap("[{ foo: string }?, string?]")
	})

	it("optional nested object tuple", () => {
		const t = type([[[{ foo: "string" }, "?"]], ["string", "?"]])
		attest<
			[
				[
					{
						foo: string
					}?
				],
				string?
			]
		>(t.t)
		attest(t.expression).snap("[[{ foo: string }?], string?]")
	})
})
