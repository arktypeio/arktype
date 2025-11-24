import { attest, contextualize } from "@ark/attest"
import { intrinsic, writeInvalidOperandMessage } from "@ark/schema"
import { regex, type Type, type } from "arktype"

contextualize(() => {
	describe("intersection", () => {
		it("distinct strings", () => {
			const T = type("/a/&/b/")
			attest<`${string}a${string}` & `${string}b${string}`>(T.infer)
			attest(T.allows("a")).equals(false)
			attest(T.allows("b")).equals(false)
			attest(T.allows("ab")).equals(true)
		})

		it("identical strings", () => {
			const T = type("/a/&/a/")
			attest(T.json).equals(type("/a/").json)
		})

		it("string and list", () => {
			const Expected = type("/a/&/b/&/c/").json
			attest(type(["/a/", "&", "/b/&/c/"]).json).equals(Expected)
			attest(type(["/a/", "&", "/b/&/c/"]).json).equals(Expected)
		})

		it("redundant string and list", () => {
			const Expected = type("/a/&/b/&/c/").json
			attest(type(["/a/", "&", "/a/&/b/&/c/"]).json).equals(Expected)
			attest(type(["/a/&/b/&/c/", "&", "/c/"]).json).equals(Expected)
		})

		it("distinct lists", () => {
			const T = type(["/a/&/b/", "&", "/c/&/d/"])
			attest(T.json).equals(type("/a/&/b/&/c/&/d/").json)
		})

		it("overlapping lists", () => {
			const T = type(["/a/&/b/", "&", "/c/&/b/"])
			attest(T.json).equals(type("/a/&/b/&/c/").json)
		})

		it("identical lists", () => {
			const T = type(["/a/&/b/", "&", "/b/&/a/"])
			attest(T.json).equals(type("/a/&/b/").json)
		})
	})

	describe("instance", () => {
		it("flagless", () => {
			const T = type(/.*/)
			attest<string>(T.infer)
			attest(T.json).equals(type("/.*/").json)
		})

		it("single flag preserved", () => {
			const T = type(/a/i)
			// the flag should prevent it from reducing to the same regex
			attest(T.json === type("/a/").json).equals(false)
			attest(T.allows("A")).equals(true)
		})

		it("flag order doesn't matter", () => {
			const A = type(/a/gi)
			const B = type(new RegExp("a", "ig"))
			attest(A.json).equals(B.json)
		})
	})

	describe("chained", () => {
		it("matching", () => {
			const T = type("string").matching("foo")
			const Expected = type("/foo/")
			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
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

	it("expression doesn't include string basis", () => {
		const T = type(/^a.*z$/)

		attest(T.expression).snap("/^a.*z$/")
	})

	it("arkregex integration", () => {
		const T = type({
			email: regex("^.*@.*$")
		})

		attest(T.expression).snap()
		attest<
			Type<{
				email: `${string}@${string}`
			}>
		>(T)
	})
})
