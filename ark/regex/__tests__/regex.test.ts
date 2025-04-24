import { attest, contextualize } from "@ark/attest"
import { regex } from "@ark/regex"

type({
	foo: "/.* | string | number \\d/"
})

contextualize(() => {
	describe("anchors", () => {
		it("multiple start branches", () => {
			const S = regex("^foo|^bar")
			attest<`foo${string}` | `bar${string}`>(S.infer)
		})

		it("inner outer anchors", () => {
			const S = regex("(^bo(innerAnchored$|innerUnanchored))")
			attest<"boinnerAnchored" | `boinnerUnanchored${string}`>(S.infer)
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
		attest<`${string}abc${string}`>(S.infer)
	})

	it("start", () => {
		const S = regex("^a")
		attest<`a${string}`>(S.infer)
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
		attest<`a${"b" | ""}c`>(S.infer)
	})

	// it("character sets", () => {
	// 	const S = regex("^a[abc]$")
	// 	attest<`a${"a" | "b" | "c"}`>(S.infer)
	// })

	// it("character set ranges", () => {
	// 	const S = regex("^a[x-z]$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("character set dashes", () => {
	// 	const S = regex("^a[\\^a\\-b]$")
	// 	attest<`a${"^" | "a" | "-" | "b"}`>(S.infer)
	// })

	// it(".", () => {
	// 	const S = regex("^a.$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("?", () => {
	// 	const S = regex("^ab?c$")
	// 	attest<`a${"b" | ""}c`>(S.infer)
	// })

	// it("+", () => {
	// 	const S = regex("^ab+c$")
	// 	attest<`a${string}c`>(S.infer)
	// })

	// it("+?", () => {
	// 	const S = regex("^ab+?c$")
	// 	attest<`a${string}c`>(S.infer)
	// })

	// it("*", () => {
	// 	const S = regex("^ab*c$")
	// 	attest<`a${string}c`>(S.infer)
	// })

	// it("{} up to including length 3", () => {
	// 	const S = regex("^x{0}a{1}b{2}c{3}d{,3}e{1,2}f{4}$")
	// 	attest<`abbccc${"" | "d" | "dd" | "ddd"}${"e" | "ee"}${string}`>(S.infer)
	// })

	// it("\\w", () => {
	// 	const S = regex("^a\\wc$")
	// 	attest<`a${AlphanumericCharacter | "_"}c`>(S.infer)
	// })

	// it("\\d", () => {
	// 	const S = regex("^a\\dc$")
	// 	attest<`a${DigitCharacter}c`>(S.infer)
	// })

	// it("\\s", () => {
	// 	const S = regex("^a\\sc$")
	// 	attest<`a${WhitespaceCharacter}c`>(S.infer)
	// })

	// it("\\W", () => {
	// 	const S = regex("^a\\W$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("\\D", () => {
	// 	const S = regex("^a\\D$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("\\S", () => {
	// 	const S = regex("^a\\S$")
	// 	attest<`a${string}`>(S.infer)
	// })

	// it("groups", () => {
	// 	const S = regex("^(abc)(?:def)(?=ghi)(?!jkl)$")
	// 	attest<`abcdefghi${string}`>(S.infer)
	// })

	// it("backreferences and escaped character codes", () => {
	// 	const S = regex("^(abc)\\1\\256$")
	// 	attest<`abc${string}${string}`>(S.infer)
	// })

	// it("unions", () => {
	// 	const S = regex("^abc|def|ghi$")
	// 	attest<"abc" | "def" | "ghi">(S.infer)
	// })

	// it("reports unclosed character sets", () => {
	// 	const S = regex("^abc[$")
	// 	attest<"abc" | "def" | "ghi">(S.infer)
	// })
})
