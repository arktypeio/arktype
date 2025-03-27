import { attest, contextualize } from "@ark/attest"
import { intrinsic, writeInvalidOperandMessage } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	describe("intersection", () => {
		it("distinct strings", () => {
			const t = type("/a/&/b/")
			attest<string>(t.infer)
			attest(t.allows("a")).equals(false)
			attest(t.allows("b")).equals(false)
			attest(t.allows("ab")).equals(true)
		})

		it("identical strings", () => {
			const t = type("/a/&/a/")
			attest(t.json).equals(type("/a/").json)
		})

		it("string and list", () => {
			const expected = type("/a/&/b/&/c/").json
			attest(type(["/a/", "&", "/b/&/c/"]).json).equals(expected)
			attest(type(["/a/", "&", "/b/&/c/"]).json).equals(expected)
		})

		it("redundant string and list", () => {
			const expected = type("/a/&/b/&/c/").json
			attest(type(["/a/", "&", "/a/&/b/&/c/"]).json).equals(expected)
			attest(type(["/a/&/b/&/c/", "&", "/c/"]).json).equals(expected)
		})

		it("distinct lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/d/"])
			attest(t.json).equals(type("/a/&/b/&/c/&/d/").json)
		})

		it("overlapping lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/b/"])
			attest(t.json).equals(type("/a/&/b/&/c/").json)
		})

		it("identical lists", () => {
			const t = type(["/a/&/b/", "&", "/b/&/a/"])
			attest(t.json).equals(type("/a/&/b/").json)
		})
	})

	describe("instance", () => {
		it("flagless", () => {
			const t = type(/.*/)
			attest<string>(t.infer)
			attest(t.json).equals(type("/.*/").json)
		})

		it("single flag preserved", () => {
			const t = type(/a/i)
			// the flag should prevent it from reducing to the same regex
			attest(t.json === type("/a/").json).equals(false)
			attest(t.allows("A")).equals(true)
		})

		it("flag order doesn't matter", () => {
			const a = type(/a/gi)
			const b = type(new RegExp("a", "ig"))
			attest(a.json).equals(b.json)
		})
	})

	describe("chained", () => {
		it("matching", () => {
			const t = type("string").matching("foo")
			const expected = type("/foo/")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid operand", () => {
			// @ts-expect-error
			attest(() => type("number").matching("foo"))
				.throws(
					writeInvalidOperandMessage(
						"pattern",
						intrinsic.string,
						intrinsic.number
					)
				)
				.type.errors("Property 'matching' does not exist")
		})
	})

	it("expression doesn't include string", () => {
		const t = type(/^a.*z$/)

		attest(t.expression).snap("/^a.*z$/")
	})
})
