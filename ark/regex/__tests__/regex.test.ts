import { attest, contextualize } from "@ark/attest"
import { regex, type Regex } from "@ark/regex"
import type { next } from "@ark/regex/internal/parse.js"
import type { State } from "@ark/regex/internal/state.js"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	type WhitespaceChar
} from "@ark/util"

type iterate<s extends State, until extends number, counter extends 1[] = []> =
	counter["length"] extends until ? s : iterate<next<s>, until, [...counter, 1]>

contextualize(() => {
	it("erate", () => {
		type s = iterate<State.initialize<"^(a)b\\1$">, 4>
		attest<"b\\1$", s["unscanned"]>()
	})

	describe("literals", () => {
		it("base", () => {
			const S = regex("abc")
			attest<Regex<`${string}abc${string}`>>(S).type.toString.snap(
				"Regex<`${string}abc${string}`, {}>"
			)
		})

		it("empty", () => {
			const S = regex("")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})
	})

	describe("anchors", () => {
		it("start", () => {
			const S = regex("^a")
			attest<Regex<`a${string}`>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			)
		})

		it("end", () => {
			const S = regex("a$")
			attest<Regex<`${string}a`>>(S).type.toString.snap(
				"Regex<`${string}a`, {}>"
			)
		})

		it("start and end", () => {
			const S = regex("^a$")
			attest<Regex<`a`>>(S).type.toString.snap('Regex<"a", {}>')
		})

		it("multiple start branches", () => {
			const S = regex("^foo|^bar")
			attest<Regex<`foo${string}` | `bar${string}`>>(S)
		})

		it("multiple end branches", () => {
			const S = regex("foo$|bar$")
			attest<Regex<`${string}foo` | `${string}bar`>>(S)
		})

		it("mixed anchor branches", () => {
			const S = regex("^foo|bar$")
			attest<Regex<`foo${string}` | `${string}bar`>>(S)
		})

		it("inner outer anchors", () => {
			const S = regex("(^bo(innerAnchored$|innerUnanchored))")
			attest<
				Regex<
					"boinnerAnchored" | `boinnerUnanchored${string}`,
					{
						1: "boinnerAnchored" | "boinnerUnanchored"
						2: "innerAnchored" | "innerUnanchored"
					}
				>
			>(S)
		})

		it("consecutive start", () => {
			// @ts-expect-error
			attest(() => regex("^^")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})

		it("consecutive end", () => {
			// @ts-expect-error
			attest(() => regex("$$")).type.errors(
				"Anchor $ may not appear mid-pattern"
			)
		})

		it("start after first char", () => {
			// @ts-expect-error
			attest(() => regex("a^")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})

		it("end before last char", () => {
			// @ts-expect-error
			attest(() => regex("$a")).type.errors(
				"Anchor $ may not appear mid-pattern"
			)
		})

		it("start after first char in group", () => {
			// @ts-expect-error
			attest(() => regex("f(^)")).type.errors(
				"Anchor ^ may not appear mid-pattern"
			)
		})

		it("end before last char in group", () => {
			// @ts-expect-error
			attest(() => regex("($a)")).type.errors(
				"Anchor $ may not appear mid-pattern"
			)
		})
	})

	describe("simple quantifiers", () => {
		it("?", () => {
			const S = regex("^ab?c$")
			attest<Regex<`a${"b" | ""}c`>>(S)
		})

		it("??", () => {
			const S = regex("^ab??c$")
			attest<Regex<`a${"b" | ""}c`>>(S)
		})

		it("+", () => {
			const S = regex("^ab+c$")
			attest<Regex<`ab${string}c`>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("+?", () => {
			const S = regex("^ab+?c$")
			attest<Regex<`ab${string}c`>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("*", () => {
			const S = regex("^ab*c$")
			attest<Regex<"ac" | `ab${string}c`>>(S).type.toString.snap(
				'Regex<"ac" | `ab${string}c`, {}>'
			)
		})

		it("*?", () => {
			const S = regex("^ab*?c$")
			attest<Regex<"ac" | `ab${string}c`>>(S).type.toString.snap(
				'Regex<"ac" | `ab${string}c`, {}>'
			)
		})

		it("unmatched ?", () => {
			// @ts-expect-error
			attest(() => regex("?")).type.errors(
				"Quantifier ? requires a preceding token"
			)
		})

		it("unmatched +", () => {
			// @ts-expect-error
			attest(() => regex("+")).type.errors(
				"Quantifier + requires a preceding token"
			)
		})

		it("unmatched *", () => {
			// @ts-expect-error
			attest(() => regex("*")).type.errors(
				"Quantifier * requires a preceding token"
			)
		})

		it("unmatched ??", () => {
			// @ts-expect-error
			attest(() => regex("??")).type.errors(
				"Quantifier ? requires a preceding token"
			)
		})
	})

	describe("ranges", () => {
		it("exact", () => {
			const S = regex("^a{2}$")
			attest<Regex<"aa">>(S).type.toString.snap('Regex<"aa", {}>')
		})

		it("min", () => {
			const S = regex("^a{2,}$")
			attest<Regex<`aa${string}`>>(S).type.toString.snap(
				"Regex<`aa${string}`, {}>"
			)
		})

		it("min max", () => {
			const S = regex("^a{2,4}$")
			attest<Regex<"aa" | "aaa" | "aaaa">>(S)
		})

		it("min max lazy", () => {
			const S = regex("^a{2,4}?$")
			attest<Regex<"aa" | "aaa" | "aaaa">>(S)
		})

		it("min max group", () => {
			const S = regex("^(ab){1,2}$")
			attest<Regex<"ab" | "abab", { 1: "ab" }>>(S)
		})

		it("zero or more greedy", () => {
			const S = regex("^a{0,}$")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("zero or more lazy", () => {
			const S = regex("^a{0,}?$")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("zero or one", () => {
			const S = regex("^a{0,1}$")
			attest<Regex<"" | "a">>(S)
		})

		it("zero or one lazy", () => {
			const S = regex("^a{0,1}?$")
			attest<Regex<"" | "a">>(S)
		})

		it("falls back to literal for missing min", () => {
			const r = regex("^a{,2}$")
			attest<Regex<"a{,2}">>(r).type.toString.snap('Regex<"a{,2}", {}>')
		})

		it("fallsback to literal on empty", () => {
			const r = regex("^a{}$")
			attest<Regex<"a{}">>(r).type.toString.snap('Regex<"a{}", {}>')
		})

		it("falls back to literal for non-numeric", () => {
			const r = regex("^a{1,foo}$")
			attest<Regex<"a{1,foo}">>(r).type.toString.snap('Regex<"a{1,foo}", {}>')
		})

		it("many ranges", () => {
			const S = regex("^x{0}a{1}b{2}c{3}d{3,}e{1,2}f{4}$")
			attest<Regex<`abbcccddd${string}effff` | `abbcccddd${string}eeffff`>>(S)
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

	describe("character sets", () => {
		it("literals", () => {
			const S = regex("^a[abc]$")
			attest<Regex<`a${"a" | "b" | "c"}`>>(S)
		})

		it("ranges", () => {
			const S = regex("^a[x-z]$")
			attest<Regex<`a${string}`>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			) // ranges widen to string for now
		})

		it("literal dash start", () => {
			const S = regex("^a[-abc]$")
			attest<Regex<`a${"-" | "a" | "b" | "c"}`>>(S)
		})

		it("literal dash end", () => {
			const S = regex("^a[abc-]$")
			attest<Regex<`a${"a" | "b" | "c" | "-"}`>>(S)
		})

		it("escaped dash", () => {
			const S = regex("^a[a\\-c]$")
			attest<Regex<`a${"a" | "-" | "c"}`>>(S)
		})

		it("escaped caret", () => {
			const S = regex("^a[\\^bc]$")
			attest<Regex<`a${"^" | "b" | "c"}`>>(S)
		})

		it("escaped closing bracket", () => {
			const S = regex("^a[bc\\]]$")
			attest<Regex<`a${"b" | "c" | "]"}`>>(S)
		})

		it("escaped backslash", () => {
			const S = regex("^a[bc\\\\]$")
			attest<Regex<`a${"b" | "c" | "\\"}`>>(S)
		})

		it("negated", () => {
			const S = regex("^a[^abc]$")
			// always widens to string, inner contents not parsed
			attest<Regex<`a${string}`>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			)
		})

		it("shorthand", () => {
			const S = regex("^a[\\d]$")
			attest<Regex<`a${bigint}`>>(S).type.toString.snap(
				"Regex<`a${bigint}`, {}>"
			)
		})

		it("unclosed", () => {
			// @ts-expect-error
			attest(() => regex("[abc")).type.errors(writeUnclosedGroupMessage("]"))
		})

		it("unclosed negated", () => {
			// @ts-expect-error
			attest(() => regex("[^abc")).type.errors(writeUnclosedGroupMessage("]"))
		})

		it("empty", () => {
			// @ts-expect-error
			attest(() => regex("[]")).type.errors(
				"Empty character set [] is unsatisfiable"
			)
		})
	})

	describe("escapes", () => {
		it("\\w", () => {
			const S = regex("^a\\wc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\d", () => {
			const S = regex("^a\\dc$")
			attest<Regex<`a${bigint}c`>>(S).type.toString.snap(
				"Regex<`a${bigint}c`, {}>"
			)
		})

		it("\\s", () => {
			const S = regex("^a\\sc$")
			attest<Regex<`a${WhitespaceChar}c`>>(S)
		})

		it("\\W", () => {
			const S = regex("^a\\Wc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\D", () => {
			const S = regex("^a\\Dc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\S", () => {
			const S = regex("^a\\Sc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("escaped quantifier", () => {
			const S = regex("^a\\?c$")
			attest<Regex<`a?c`>>(S)
		})

		it("escaped anchor", () => {
			const S = regex("^a\\^c$")
			attest<Regex<`a^c`>>(S)
		})

		it("escaped group delimiter", () => {
			const S = regex("^a\\(c$")
			attest<Regex<`a(c`>>(S)
		})

		it("escaped charset delimiter", () => {
			const S = regex("^a\\[c$")
			attest<Regex<`a[c`>>(S)
		})

		it("escaped alternator", () => {
			const S = regex("^a\\|c$")
			attest<Regex<`a|c`>>(S)
		})

		it("escaped wildcard", () => {
			const S = regex("^a\\.c$")
			attest<Regex<`a.c`>>(S)
		})

		it("escaped backslash", () => {
			const S = regex("^a\\\\c$")
			attest<Regex<`a\\c`>>(S)
		})

		it("unnecessary escape", () => {
			// @ts-expect-error
			attest(() => regex("\\a")).type.errors(
				"Escape preceding a is unnecessary and should be removed"
			)
		})

		it("trailing escape", () => {
			// @ts-expect-error
			attest(() => regex("abc\\")).type.errors("A regex cannot end with \\")
		})

		// TODO
		// it("\\b", () => {
		// 	const S = regex("word\\b")
		// 	attest<Regex<`${string}word`>>(S).type.toString.snap()
		// })

		// it("\\B", () => {
		// 	const S = regex("word\\B")
		// 	attest<Regex<`${string}word${string}`>>(S).type.toString.snap()
		// })

		// it("group followed by \\b", () => {
		// 	const S = regex("(ab)\\b")
		// 	attest<Regex<`${string}ab`, { 1: "ab" }>>(S).type.toString.snap()
		// })

		// it("group followed by \\B", () => {
		// 	const S = regex("(ab)\\B")
		// 	attest<Regex<`${string}ab${string}`, { 1: "ab" }>>(S).type.toString.snap()
		// })

		// it("common escapes", () => {
		// 	const S = regex("\\t\\n\\r\\v\\f")
		// 	attest<Regex<"\t\n\r\v\f">>(S).type.toString.snap()
		// })

		// it("hex escape", () => {
		// 	const S = regex("a\\x62c")
		// 	attest<Regex<"abc">>(S).type.toString.snap()
		// })

		// it("unicode escape (4 digit)", () => {
		// 	const S = regex("a\\u0062c")
		// 	attest<Regex<"abc">>(S).type.toString.snap()
		// })

		// it("unicode escape (braced)", () => {
		// 	const S = regex("a\\u{62}c")
		// 	attest<Regex<"abc">>(S).type.toString.snap()
		// })

		// it("unicode escape (braced multi-digit)", () => {
		// 	const S = regex("a\\u{00000062}c")
		// 	attest<Regex<"abc">>(S).type.toString.snap()
		// })

		// it("control escape", () => {
		// 	const S = regex("\\cA")
		// 	attest<Regex<"\x01">>(S).type.toString.snap()
		// })

		// it("invalid hex escape", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\xG0")).type.errors.snap()
		// })

		// it("incomplete hex escape", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\x1")).type.errors.snap()
		// })

		// it("invalid unicode escape (4 digit)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\uG000")).type.errors.snap()
		// })

		// it("incomplete unicode escape (4 digit)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\u123")).type.errors.snap()
		// })

		// it("invalid unicode escape (braced)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\u{G}")).type.errors.snap()
		// })

		// it("unclosed unicode escape (braced)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\u{123")).type.errors.snap()
		// })

		// it("control escape with non-ascii char", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\c~")).type.errors.snap()
		// })
	})

	describe("groups", () => {
		it("capturing", () => {
			const S = regex("^(a(b)c)$")
			attest<Regex<`abc`, { 1: `abc`; 2: `b` }>>(S)
		})

		it("non-capturing", () => {
			const S = regex("^(a(?:b)c)$")
			attest<Regex<`abc`, { 1: `abc` }>>(S).type.toString.snap(
				'Regex<"abc", { 1: "abc" }>'
			)
		})

		it("quantified", () => {
			const S = regex("^a(?:b)+c$")
			attest<Regex<`ab${string}c`>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("nested", () => {
			const S = regex("^(a(b(c)))$")
			attest<Regex<`abc`, { 1: `abc`; 2: `bc`; 3: `c` }>>(S)
		})

		it("unclosed", () => {
			// @ts-expect-error
			attest(() => regex("(abc")).type.errors(writeUnclosedGroupMessage(")"))
		})

		it("unmatched", () => {
			// @ts-expect-error
			attest(() => regex("abc)")).type.errors(
				writeUnmatchedGroupCloseMessage(")")
			)
		})

		it("empty", () => {
			const S = regex("()")
			attest<Regex<`${string}${string}`, { 1: "" }>>(S).type.toString.snap(
				'Regex<string, { 1: "" }>'
			)
		})
	})

	describe("alternation", () => {
		it("basic", () => {
			const S = regex("^a|b$")
			attest<Regex<`a${string}` | `${string}b`>>(S)
		})

		it("multiple", () => {
			const S = regex("^a|b|c$")
			attest<Regex<`a${string}` | `${string}b${string}` | `${string}c`>>(S)
		})

		it("within group", () => {
			const S = regex("^(a|b)c$")
			attest<Regex<"ac" | "bc", { 1: "a" | "b" }>>(S)
		})

		it("empty start branch", () => {
			const S = regex("^|b$")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("empty end branch", () => {
			const S = regex("^a|$")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("empty middle branch", () => {
			const S = regex("^a||c$")
			attest<Regex<string>>(S).type.toString.snap("Regex<string, {}>")
		})
	})

	it(".", () => {
		const S = regex("^a.$")
		attest<Regex<`a${string}`>>(S)
	})

	it("consecutive .", () => {
		const S = regex("^a..c$")
		// collapsed to single {string}
		attest<Regex<`a${string}c`>>(S).type.toString.snap(
			"Regex<`a${string}c`, {}>"
		)
	})

	describe("index backreferences", () => {
		it("basic", () => {
			const S = regex("^(a)b\\1$")
			attest<Regex<`aba`, { 1: "a" }>>(S).type.toString.snap(
				'Regex<"aba", { 1: "a" }>'
			)
		})

		// treated as empty string by JS since capture hasn't occurred yet
		it("reference to current", () => {
			const S = regex("^(a\\1b)c\\1$")
			attest<Regex<`abcab`, { 1: `ab` }>>(S)
		})

		it("union", () => {
			const S = regex("^(a|b)\\1$")
			attest<
				Regex<
					"ab" | "aa" | "ba" | "bb",
					{
						1: "a" | "b"
					}
				>
			>(S)
		})

		it("inner quantified", () => {
			const S = regex("^(a+)\\1$")
			attest<Regex<`a${string}`, { 1: `a${string}` }>>(S)
		})

		it("group quantified", () => {
			const S = regex("^(a)+\\1$")
			attest<Regex<`a${string}a`, { 1: "a" }>>(S)
		})

		it("ref quantified", () => {
			const S = regex("^(a)\\1+$")
			attest<
				Regex<
					`aa${string}`,
					{
						1: "a"
					}
				>
			>(S)
		})

		it("index out of range", () => {
			// @ts-expect-error
			attest(() => regex("(a)b\\2")).type.errors("Group 2 does not exist ")
		})

		it("index 0 (invalid backreference)", () => {
			// @ts-expect-error
			attest(() => regex("abc\\0")).type.errors("Group 0 does not exist ")
		})

		// TODO
		// it("invalid octal (\\8)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\8")).type.errors.snap()
		// })

		// it("invalid octal (\\08)", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\08")).type.errors.snap()
		// })

		// it("forward reference", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("\\1(a)")).type.errors.snap()
		// })

		// it("forward reference in group", () => {
		// 	// @ts-expect-error
		// 	attest(() => regex("(\\2a)(b)")).type.errors.snap()
		// })

		// it("escaped digit not backreference", () => {
		// 	const S = regex("\\1")
		// 	attest<Regex<"\\1">>(S).type.toString.snap()
		// })

		// it("escaped octal 0 not backreference", () => {
		// 	const S = regex("\\0") // Literal null character
		// 	attest<Regex<"\x00">>(S).type.toString.snap()
		// })

		// it("escaped octal not backreference", () => {
		// 	const S = regex("\\07") // Octal escape
		// 	attest<Regex<"\x07">>(S).type.toString.snap()
		// })

		// it("escaped octal with non-octal char", () => {
		// 	const S = regex("\\07a") // Octal + literal
		// 	attest<Regex<"\x07a">>(S).type.toString.snap()
		// })
	})

	describe("named backreference", () => {
		it("unreferenced", () => {
			const S = regex("^(?<foo>abc)$")
			attest<Regex<`abc`, { foo: `abc`; 1: `abc` }>>(S)
		})

		it("simple reference", () => {
			const S = regex("^(?<foo>a)b\\k<foo>$")
			attest<Regex<`aba`, { foo: "a"; 1: "a" }>>(S)
		})

		it("nested", () => {
			const S = regex("^(?<outer>a(?<inner>b)c)\\k<outer>\\k<inner>$")
			attest<
				Regex<
					"abcabcb",
					{
						outer: "abc"
						1: "abc"
						2: "b"
						inner: "b"
					}
				>
			>(S)
		})

		// treated as empty string by JS since capture hasn't occurred yet
		it("reference to current", () => {
			const S = regex("^(?<foo>a\\k<foo>b)c\\k<foo>$")
			attest<Regex<"abcab", { foo: "ab"; 1: "ab" }>>(S)
		})

		it("inner quantified group", () => {
			const S = regex("^(?<foo>a+)\\k<foo>$")
			attest<Regex<`a${string}`, { foo: `a${string}`; 1: `a${string}` }>>(S)
		})

		it("group quantified", () => {
			const S = regex("^(?<foo>a)+\\k<foo>$")
			attest<Regex<`a${string}a`, { foo: "a"; 1: "a" }>>(S)
		})

		it("ref quantified", () => {
			const S = regex("^(?<foo>a)\\k<foo>+$")
			attest<
				Regex<
					`aa${string}`,
					{
						foo: "a"
						1: "a"
					}
				>
			>(S)
		})

		it("named union group", () => {
			const S = regex("^(?<foo>a|b)\\k<foo>$")
			attest<
				Regex<
					"aa" | "ab" | "ba" | "bb",
					{
						foo: "a" | "b"
						1: "a" | "b"
					}
				>
			>(S)
		})

		it("unclosed group", () => {
			// @ts-expect-error
			attest(() => regex("(?<foo>abc")).type.errors(
				writeUnclosedGroupMessage(")")
			)
		})

		it("unclosed name", () => {
			// @ts-expect-error
			attest(() => regex("(?<fooabc)")).type.errors(
				writeUnclosedGroupMessage(">")
			)
		})

		it("empty name", () => {
			// @ts-expect-error
			attest(() => regex("(?<>foo)")).type.errors(
				"Capture group <> requires a name "
			)
		})

		it("unresolvable", () => {
			// @ts-expect-error
			attest(() => regex("(?<foo>a)b\\k<bar>")).type.errors(
				"named reference does not exist "
			)
		})

		it("forward reference", () => {
			// @ts-expect-error
			attest(() => regex("\\k<foo>(?<foo>a)")).type.errors(
				"named reference does not exist "
			)
		})

		it("missing reference", () => {
			// @ts-expect-error
			attest(() => regex("^(?<foo>a)b\\k$")).type.errors(
				"\\k must be followed by a named reference like <name>"
			)
		})

		it("\\k< without name", () => {
			// @ts-expect-error
			attest(() => regex("\\k<>")).type.errors(
				"named reference does not exist "
			)
		})

		it("\\k<name without >", () => {
			// @ts-expect-error
			attest(() => regex("\\k<foo")).type.errors(
				"k must be followed by a named reference like <name> "
			)
		})
	})

	// TODO
	// describe("lookaheads", () => {
	// 	it("positive", () => {
	// 		const S = regex("a(?=b)b")
	// 		attest<Regex<"ab">>(S).type.toString.snap()
	// 	})

	// 	it("negative", () => {
	// 		const S = regex("a(?!c)b")
	// 		attest<Regex<"ab">>(S).type.toString.snap()
	// 	})

	// 	it("nested", () => {
	// 		const S = regex("a(?=b(?!d)c)bc")
	// 		attest<Regex<"abc">>(S).type.toString.snap()
	// 	})

	// 	it("quantified lookahead", () => {
	// 		// Note: Quantifiers on lookarounds generally don't make sense semantically
	// 		// and are often ignored or behave unexpectedly in regex engines.
	// 		// The type inference might reflect the engine's behavior or a simplified
	// 		// interpretation.
	// 		const S = regex("a(?=b)?b")
	// 		attest<Regex<"ab">>(S).type.toString.snap()
	// 	})

	// 	it("unclosed lookahead", () => {
	// 		// @ts-expect-error
	// 		attest(() => regex("a(?=b")).type.errors(writeUnclosedGroupMessage(")"))
	// 	})
	// })

	// describe("lookbehinds", () => {
	// 	it("positive", () => {
	// 		const S = regex("a(?<=a)b")
	// 		attest<Regex<"ab">>(S).type.toString.snap()
	// 	})

	// 	it("negative", () => {
	// 		const S = regex("a(?<!b)c")
	// 		attest<Regex<"ac">>(S).type.toString.snap()
	// 	})

	// 	it("nested", () => {
	// 		const S = regex("abc(?<=b(?<!d)c)")
	// 		attest<Regex<"abc">>(S).type.toString.snap()
	// 	})

	// 	it("unclosed lookbehind", () => {
	// 		// @ts-expect-error
	// 		attest(() => regex("(?<=a)b")).type.errors(writeUnclosedGroupMessage(")"))
	// 	})
	// })
})
