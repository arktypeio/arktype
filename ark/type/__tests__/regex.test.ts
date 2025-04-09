import { attest, contextualize } from "@ark/attest"
import { intrinsic, writeInvalidOperandMessage } from "@ark/schema"
import { type } from "arktype"
import type {
	AlphanumericCharacter,
	DigitCharacter,
	WhitespaceCharacter
} from "../parser/shift/operand/regexp.js"

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

	it("expression doesn't include string", () => {
		const T = type(/^a.*z$/)

		attest(T.expression).snap("/^a.*z$/")
	})

	describe("inference", () => {
		it("infers literals", () => {
			const t = type("/abc/")
			attest<`${string}abc${string}`>(t.infer)
		})

		it("infers start", () => {
			const t = type("/^a/")
			attest<`a${string}`>(t.infer)
		})

		it("infers end", () => {
			const t = type("/a$/")
			attest<`${string}a`>(t.infer)
		})

		it("infers start and end", () => {
			const t = type("/^a$/")
			attest<`a`>(t.infer)
		})

		it("infers character sets", () => {
			const t = type("/^a[abc]$/")
			attest<`a${"a" | "b" | "c"}`>(t.infer)
		})

		it("infers character set ranges", () => {
			const t = type("/^a[x-z]$/")
			attest<`a${string}`>(t.infer)
		})

		it("infers character set dashes", () => {
			const t = type("/^a[\\^a\\-b]$/")
			attest<`a${"^" | "a" | "-" | "b"}`>(t.infer)
		})

		it("infers .", () => {
			const t = type("/^a.$/")
			attest<`a${string}`>(t.infer)
		})

		it("infers ?", () => {
			const t = type("/^ab?c$/")
			attest<`a${"b" | ""}c`>(t.infer)
		})

		it("infers +", () => {
			const t = type("/^ab+c$/")
			attest<`a${string}c`>(t.infer)
		})

		it("infers +?", () => {
			const t = type("/^ab+?c$/")
			attest<`a${string}c`>(t.infer)
		})

		it("infers *", () => {
			const t = type("/^ab*c$/")
			attest<`a${string}c`>(t.infer)
		})

		it("infers {} up to including length 3", () => {
			const t = type("/^x{0}a{1}b{2}c{3}d{,3}e{1,2}f{4}$/")
			attest<`abbccc${"" | "d" | "dd" | "ddd"}${"e" | "ee"}${string}`>(t.infer)
		})

		it("infers \\w", () => {
			const t = type("/^a\\wc$/")
			attest<`a${AlphanumericCharacter | "_"}c`>(t.infer)
		})

		it("infers \\d", () => {
			const t = type("/^a\\dc$/")
			attest<`a${DigitCharacter}c`>(t.infer)
		})

		it("infers \\s", () => {
			const t = type("/^a\\sc$/")
			attest<`a${WhitespaceCharacter}c`>(t.infer)
		})

		it("infers \\W", () => {
			const t = type("/^a\\W$/")
			attest<`a${string}`>(t.infer)
		})

		it("infers \\D", () => {
			const t = type("/^a\\D$/")
			attest<`a${string}`>(t.infer)
		})

		it("infers \\S", () => {
			const t = type("/^a\\S$/")
			attest<`a${string}`>(t.infer)
		})

		it("infers groups", () => {
			const t = type("/^(abc)(?:def)(?=ghi)(?!jkl)$/")
			attest<`abcdefghi${string}`>(t.infer)
		})

		it("infers backreferences and escaped character codes", () => {
			const t = type("/^(abc)\\1\\256$/")
			attest<`abc${string}${string}`>(t.infer)
		})

		it("infers unions", () => {
			const t = type("/^abc|def|ghi$/")
			attest<"abc" | "def" | "ghi">(t.infer)
		})

		it("reports unclosed character sets", () => {
			const t = type("/^abc[$/")
			attest<"abc" | "def" | "ghi">(t.infer)
		})
	})
})
