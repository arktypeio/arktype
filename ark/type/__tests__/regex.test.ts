import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"

suite("regex", () => {
	suite("intersection", () => {
		test("distinct strings", () => {
			const t = type("/a/&/b/")
			attest(t.infer).typed as string
			attest(t.allows("a")).equals(false)
			attest(t.allows("b")).equals(false)
			attest(t.allows("ab")).equals(true)
		})
		test("identical strings", () => {
			const t = type("/a/&/a/")
			attest(t.condition).equals(type("/a/").condition)
		})
		test("string and list", () => {
			const expected = type("/a/&/b/&/c/").condition
			attest(type(["/a/", "&", "/b/&/c/"]).condition).equals(expected)
			attest(type(["/a/", "&", "/b/&/c/"]).condition).equals(expected)
		})
		test("redundant string and list", () => {
			const expected = type("/a/&/b/&/c/").condition
			attest(type(["/a/", "&", "/a/&/b/&/c/"]).condition).equals(expected)
			attest(type(["/a/&/b/&/c/", "&", "/c/"]).condition).equals(expected)
		})
		test("distinct lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/d/"])
			attest(t.condition).equals(type("/a/&/b/&/c/&/d/").condition)
		})
		test("overlapping lists", () => {
			const t = type(["/a/&/b/", "&", "/c/&/b/"])
			attest(t.condition).equals(type("/a/&/b/&/c/").condition)
		})
		test("identical lists", () => {
			const t = type(["/a/&/b/", "&", "/b/&/a/"])
			attest(t.condition).equals(type("/a/&/b/").condition)
		})
	})
	suite("object literal", () => {
		test("flagless", () => {
			const t = type(/.*/)
			attest(t.infer).typed as string
			attest(t.condition).equals(type("/.*/").condition)
		})
		test("single flag preserved", () => {
			const t = type(/a/i)
			// the flag should prevent it from reducing to the same regex
			attest(t.condition === type("/a/").condition).equals(false)
			attest(t.allows("A")).equals(true)
		})
		test("flag order doesn't matter", () => {
			const a = type(/a/gi)
			const b = type(new RegExp("a", "ig"))
			attest(a.condition).equals(b.condition)
		})
	})
})
