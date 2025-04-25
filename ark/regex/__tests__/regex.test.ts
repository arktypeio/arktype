import { attest, contextualize } from "@ark/attest"
import { regex } from "@ark/regex"
import type { WhitespaceChar } from "@ark/util"

contextualize(() => {
	describe("anchors", () => {
		it("multiple start branches", () => {
			const S = regex("^foo|^bar")
			attest<`foo${string}` | `bar${string}`>(S.infer).type.toString.snap()
		})

		it("inner outer anchors", () => {
			const S = regex("(^bo(innerAnchored$|innerUnanchored))")
			attest<"boinnerAnchored" | `boinnerUnanchored${string}`>(
				S.infer
			).type.toString.snap()
		})

		it("consecutive start", () => {
			// @ts-expect-error
			attest(() => regex("^^")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})

		it("after first char", () => {
			// @ts-expect-error
			attest(() => regex("a^")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})

		it("after first char in group", () => {
			// @ts-expect-error
			attest(() => regex("f(^)")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})
	})

	it("literals", () => {
		const S = regex("abc")
		attest<`${string}abc${string}`>(S.infer).type.toString.snap()
	})

	it("start", () => {
		const S = regex("^a")
		attest<`a${string}`>(S.infer).type.toString.snap()
	})

	it("end", () => {
		const S = regex("a$")
		attest<`${string}a`>(S.infer).type.toString.snap("`${string}a`")
	})

	it("start and end", () => {
		const S = regex("^a$")
		attest<`a`>(S.infer).type.toString.snap("a")
	})

	it("consecutive string tokens collapse", () => {
		const S = regex("^..\\w\\W\\S$")
		attest<string>(S.infer).type.toString.snap("string")
	})

	it("consecutive string tokens with interpolation", () => {
		const S = regex("^..a..$")
		attest<`${string}a${string}`>(S.infer).type.toString.snap(
			"`${string}a${string}`"
		)
	})

	it("consecutive string tokens collapsed with anchors", () => {
		const S = regex(".a.")
		attest<`${string}a${string}`>(S.infer).type.toString.snap(
			"`${string}a${string}`"
		)
	})

	it("?", () => {
		const S = regex("^ab?c$")
		attest<"ac" | "abc">(S.infer).type.toString.snap()
	})

	it(".", () => {
		const S = regex("^a.$")
		attest<`a${string}`>(S.infer).type.toString.snap()
	})

	it("?", () => {
		const S = regex("^ab?c$")
		attest<`a${"b" | ""}c`>(S.infer).type.toString.snap()
	})

	it("+", () => {
		const S = regex("^ab+c$")
		attest<`ab${string}c`>(S.infer).type.toString.snap()
	})

	it("+?", () => {
		const S = regex("^ab+?c$")
		attest<`ab${string}c`>(S.infer).type.toString.snap()
	})

	it("*", () => {
		const S = regex("^ab*c$")
		attest<"ac" | `ab${string}c`>(S.infer).type.toString.snap()
	})

	describe("ranges", () => {
		it("exact", () => {
			const S = regex("^a{2}$")
			attest<"aa">(S.infer).type.toString.snap()
		})

		it("min", () => {
			const S = regex("^a{2,}$")
			attest<`aa${string}`>(S.infer).type.toString.snap()
		})

		it("min max", () => {
			const S = regex("^a{2,4}$")
			attest<"aa" | "aaa" | "aaaa">(S.infer).type.toString.snap()
		})

		it("min max lazy", () => {
			const S = regex("^a{2,4}?$")
			attest<"aa" | "aaa" | "aaaa">(S.infer).type.toString.snap()
		})

		it("min max group", () => {
			const S = regex("^(ab){1,2}$")
			attest<"ab" | "abab">(S.infer).type.toString.snap()
		})

		it("zero or more greedy", () => {
			const S = regex("^a{0,}$")
			attest<string>(S.infer).type.toString.snap()
		})

		it("zero or more lazy", () => {
			const S = regex("^a{0,}?$")
			attest<string>(S.infer).type.toString.snap()
		})

		it("zero or one", () => {
			const S = regex("^a{0,1}$")
			attest<"" | "a">(S.infer).type.toString.snap()
		})

		it("zero or one lazy", () => {
			const S = regex("^a{0,1}?$")
			attest<"" | "a">(S.infer).type.toString.snap()
		})

		it("falls back to literal for missing min", () => {
			const r = regex("^a{,2}$")
			attest<"a{,2}">(r.infer).type.toString.snap()
		})

		it("fallsback to literal on empty", () => {
			const r = regex("^a{}$")
			attest<"a{}">(r.infer).type.toString.snap()
		})

		it("falls back to literal for non-numeric", () => {
			const r = regex("^a{1,foo}$")
			attest<"a{1,foo}">(r.infer).type.toString.snap()
		})

		it("many ranges", () => {
			const S = regex("^x{0}a{1}b{2}c{3}d{3,}e{1,2}f{4}$")
			attest<`abbcccddd${string}effff` | `abbcccddd${string}eeffff`>(
				S.infer
			).type.toString.snap()
		})

		it("unmatched", () => {
			// @ts-expect-error
			attest(() => regex("{2}")).type.errors(
				"Quantifier {2} requires a preceding token"
			)
		})

		it("unmatched comma", () => {
			// @ts-expect-error
			attest(() => regex("{2,}")).type.errors(
				"Quantifier {2,} requires a preceding token"
			)
		})

		it("unmatched min max", () => {
			// @ts-expect-error
			attest(() => regex("{2,3}")).type.errors(
				"Quantifier {2,3} requires a preceding token"
			)
		})

		it("unmatched lazy", () => {
			// @ts-expect-error
			attest(() => regex("{2,3}?")).type.errors(
				"Quantifier {2,3}? requires a preceding token"
			)
		})
	})

	it("character sets", () => {
		const S = regex("^a[abc]$")
		attest<"ab" | "aa" | "ac">(S.infer)
	})

	it("\b", () => {
		const S = regex("^\b$")
		attest<"\b">(S.infer)
	})

	// it("character set ranges", () => {
	// 	const S = regex("^a[x-z]$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("character set dashes", () => {
	// 	const S = regex("^a[\\^a\\-b]$")
	// 	attest<`a${"^" | "a" | "-" | "b"}`>(S.infer)
	// })

	it("\\w", () => {
		const S = regex("^a\\wc$")
		attest<`a${string}c`>(S.infer)
	})

	it("\\d", () => {
		const S = regex("^a\\dc$")
		attest<`a${bigint}c`>(S.infer)
	})

	it("\\s", () => {
		const S = regex("^a\\sc$")
		attest<`a${WhitespaceChar}c`>(S.infer)
	})

	it("\\W", () => {
		const S = regex("^a\\W$")
		attest<`a${string}`>(S.infer)
	})

	it("\\D", () => {
		const S = regex("^a\\D$")
		attest<`a${string}`>(S.infer)
	})

	it("\\S", () => {
		const S = regex("^a\\S$")
		attest<`a${string}`>(S.infer)
	})

	// it("groups", () => {
	// 	const S = regex("^(abc)(?:def)(?=ghi)(?!jkl)$")
	// 	attest<`abcdefghi${string}`>(S.infer)
	// })

	// it("backreferences and escaped character codes", () => {
	// 	const S = regex("^(abc)\\1\\256$")
	// 	attest<`abc${string}${string}`>(S.infer)
	// })

	it("reports unclosed character sets", () => {
		// @ts-expect-error
		attest(() => regex("^abc[$")).type.errors.snap()
	})
})
