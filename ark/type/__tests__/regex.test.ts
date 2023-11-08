import { attest } from "@arktype/attest"
import { type } from "arktype"

describe("regex", () => {
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
			attest(t.condition).equals(type("/a/").condition)
		})
		it("string and list", () => {
			const expected = type("/a/&/b/&/c/").condition
			attest(type(["/a/", "&", "/b/&/c/"]).condition).equals(expected)
			attest(type(["/a/", "&", "/b/&/c/"]).condition).equals(expected)
		})
		it("redundant string and list", () => {
			const expected = type("/a/&/b/&/c/").condition
			attest(type(["/a/", "&", "/a/&/b/&/c/"]).condition).equals(expected)
			attest(type(["/a/&/b/&/c/", "&", "/c/"]).condition).equals(expected)
		})
		it("distinct lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/d/"])
			attest(t.condition).equals(type("/a/&/b/&/c/&/d/").condition)
		})
		it("overlapping lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/b/"])
			attest(t.condition).equals(type("/a/&/b/&/c/").condition)
		})
		it("identical lists", () => {
			const t = type(["/a/&/b/", "&", "/b/&/a/"])
			attest(t.condition).equals(type("/a/&/b/").condition)
		})
	})
	describe("object literal", () => {
		it("flagless", () => {
			const t = type(/.*/)
			attest<string>(t.infer)
			attest(t.condition).equals(type("/.*/").condition)
		})
		it("single flag preserved", () => {
			const t = type(/a/i)
			// the flag should prevent it from reducing to the same regex
			attest(t.condition === type("/a/").condition).equals(false)
			attest(t.allows("A")).equals(true)
		})
		it("flag order doesn't matter", () => {
			const a = type(/a/gi)
			const b = type(new RegExp("a", "ig"))
			attest(a.condition).equals(b.condition)
		})
	})
})
