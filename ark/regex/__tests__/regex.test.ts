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
			attest<Regex<`${string}abc${string}`>>(S).type.toString.snap()
		})

		it("empty", () => {
			const S = regex("")
			attest<Regex<string>>(S).type.toString.snap()
		})
	})

	describe("anchors", () => {
		it("start", () => {
			const S = regex("^a")
			attest<Regex<`a${string}`>>(S).type.toString.snap()
		})

		it("end", () => {
			const S = regex("a$")
			attest<Regex<`${string}a`>>(S).type.toString.snap()
		})

		it("start and end", () => {
			const S = regex("^a$")
			attest<Regex<`a`>>(S).type.toString.snap()
		})

		it("multiple start branches", () => {
			const S = regex("^foo|^bar")
			attest<Regex<`foo${string}` | `bar${string}`>>(S).type.toString.snap()
		})

		it("multiple end branches", () => {
			const S = regex("foo$|bar$")
			attest<Regex<`${string}foo` | `${string}bar`>>(S).type.toString.snap()
		})

		it("mixed anchor branches", () => {
			const S = regex("^foo|bar$")
			attest<Regex<`foo${string}` | `${string}bar`>>(S).type.toString.snap()
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
			>(S).type.toString.snap()
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
			attest<Regex<`a${"b" | ""}c`>>(S).type.toString.snap()
		})

		it("??", () => {
			const S = regex("^ab??c$")
			attest<Regex<`a${"b" | ""}c`>>(S).type.toString.snap()
		})

		it("+", () => {
			const S = regex("^ab+c$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("+?", () => {
			const S = regex("^ab+?c$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("*", () => {
			const S = regex("^ab*c$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("*?", () => {
			const S = regex("^ab*?c$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
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
				"Quantifier ?? requires a preceding token"
			)
		})
	})

	describe("ranges", () => {
		it("exact", () => {
			const S = regex("^a{2}$")
			attest<Regex<"aa">>(S).type.toString.snap()
		})

		it("min", () => {
			const S = regex("^a{2,}$")
			attest<Regex<`aa${string}`>>(S).type.toString.snap()
		})

		it("min max", () => {
			const S = regex("^a{2,4}$")
			attest<Regex<"aa" | "aaa" | "aaaa">>(S).type.toString.snap()
		})

		it("min max lazy", () => {
			const S = regex("^a{2,4}?$")
			attest<Regex<"aa" | "aaa" | "aaaa">>(S).type.toString.snap()
		})

		it("min max group", () => {
			const S = regex("^(ab){1,2}$")
			attest<Regex<"ab" | "abab", { 1: "ab" | "abab" }>>(S).type.toString.snap()
		})

		it("zero or more greedy", () => {
			const S = regex("^a{0,}$")
			attest<Regex<string>>(S).type.toString.snap()
		})

		it("zero or more lazy", () => {
			const S = regex("^a{0,}?$")
			attest<Regex<string>>(S).type.toString.snap()
		})

		it("zero or one", () => {
			const S = regex("^a{0,1}$")
			attest<Regex<"" | "a">>(S).type.toString.snap()
		})

		it("zero or one lazy", () => {
			const S = regex("^a{0,1}?$")
			attest<Regex<"" | "a">>(S).type.toString.snap()
		})

		it("falls back to literal for missing min", () => {
			const r = regex("^a{,2}$")
			attest<Regex<"a{,2}">>(r).type.toString.snap()
		})

		it("fallsback to literal on empty", () => {
			const r = regex("^a{}$")
			attest<Regex<"a{}">>(r).type.toString.snap()
		})

		it("falls back to literal for non-numeric", () => {
			const r = regex("^a{1,foo}$")
			attest<Regex<"a{1,foo}">>(r).type.toString.snap()
		})

		it("many ranges", () => {
			const S = regex("^x{0}a{1}b{2}c{3}d{3,}e{1,2}f{4}$")
			attest<Regex<`abbcccddd${string}effff` | `abbcccddd${string}eeffff`>>(
				S
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

	describe("character sets", () => {
		it("literals", () => {
			const S = regex("^a[abc]$")
			attest<Regex<`a${"a" | "b" | "c"}`>>(S).type.toString.snap()
		})

		it("ranges", () => {
			const S = regex("^a[x-z]$")
			attest<Regex<`a${string}`>>(S).type.toString.snap() // Ranges widen to string for now
		})

		it("literal dash start", () => {
			const S = regex("^a[-abc]$")
			attest<Regex<`a${"-" | "a" | "b" | "c"}`>>(S).type.toString.snap()
		})

		it("literal dash end", () => {
			const S = regex("^a[abc-]$")
			attest<Regex<`a${"a" | "b" | "c" | "-"}`>>(S).type.toString.snap()
		})

		it("escaped dash", () => {
			const S = regex("^a[a\\-c]$")
			attest<Regex<`a${"a" | "-" | "c"}`>>(S).type.toString.snap()
		})

		it("escaped caret", () => {
			const S = regex("^a[\\^bc]$")
			attest<Regex<`a${"^" | "b" | "c"}`>>(S).type.toString.snap()
		})

		it("escaped closing bracket", () => {
			const S = regex("^a[bc\\]]$")
			attest<Regex<`a${"b" | "c" | "]"}`>>(S).type.toString.snap()
		})

		it("escaped backslash", () => {
			const S = regex("^a[bc\\\\]$")
			attest<Regex<`a${"b" | "c" | "\\"}`>>(S).type.toString.snap()
		})

		it("negated", () => {
			const S = regex("^a[^abc]$")
			// always widens to string, inner contents not parsed
			attest<Regex<`a${string}`>>(S).type.toString.snap()
		})

		it("shorthand", () => {
			const S = regex("^a[\\d]$")
			attest<Regex<`a${bigint}`>>(S).type.toString.snap()
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
			attest(() => regex("[]")).type.errors.snap()
		})
	})

	describe("escapes", () => {
		it("\\w", () => {
			const S = regex("^a\\wc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("\\d", () => {
			const S = regex("^a\\dc$")
			attest<Regex<`a${bigint}c`>>(S).type.toString.snap()
		})

		it("\\s", () => {
			const S = regex("^a\\sc$")
			attest<Regex<`a${WhitespaceChar}c`>>(S).type.toString.snap()
		})

		it("\\W", () => {
			const S = regex("^a\\Wc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("\\D", () => {
			const S = regex("^a\\Dc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("\\S", () => {
			const S = regex("^a\\Sc$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})

		it("escaped quantifier", () => {
			const S = regex("^a\\?c$")
			attest<Regex<`a?c`>>(S).type.toString.snap()
		})

		it("escaped anchor", () => {
			const S = regex("^a\\^c$")
			attest<Regex<`a^c`>>(S).type.toString.snap()
		})

		it("escaped group delimiter", () => {
			const S = regex("^a\\(c$")
			attest<Regex<`a(c`>>(S).type.toString.snap()
		})

		it("escaped charset delimiter", () => {
			const S = regex("^a\\[c$")
			attest<Regex<`a[c`>>(S).type.toString.snap()
		})

		it("escaped alternator", () => {
			const S = regex("^a\\|c$")
			attest<Regex<`a|c`>>(S).type.toString.snap()
		})

		it("escaped wildcard", () => {
			const S = regex("^a\\.c$")
			attest<Regex<`a.c`>>(S).type.toString.snap()
		})

		it("escaped backslash", () => {
			const S = regex("^a\\\\c$")
			attest<Regex<`a\\c`>>(S).type.toString.snap()
		})

		it("unnecessary escape", () => {
			// @ts-expect-error
			attest(() => regex("\\a")).type.errors.snap()
		})

		it("trailing escape", () => {
			// @ts-expect-error
			attest(() => regex("abc\\")).type.errors.snap()
		})
	})

	describe("groups", () => {
		it("capturing", () => {
			const S = regex("^(a(b)c)$")
			attest<Regex<`abc`, { 1: `abc`; 2: `b` }>>(S).type.toString.snap()
		})

		it("non-capturing", () => {
			const S = regex("^(a(?:b)c)$")
			attest<Regex<`abc`, { 1: `abc` }>>(S).type.toString.snap()
		})

		it("nested", () => {
			const S = regex("^(a(b(c)))$")
			attest<Regex<`abc`, { 1: `abc`; 2: `bc`; 3: `c` }>>(
				S
			).type.toString.snap()
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
			attest<Regex<`${string}${string}`, { 1: "" }>>(S).type.toString.snap()
		})
	})

	describe("alternation", () => {
		it("basic", () => {
			const S = regex("^a|b$")
			attest<Regex<`a${string}` | `${string}b`>>(S).type.toString.snap()
		})

		it("multiple", () => {
			const S = regex("^a|b|c$")
			attest<Regex<`a${string}` | `${string}b${string}` | `${string}c`>>(
				S
			).type.toString.snap()
		})

		it("within group", () => {
			const S = regex("^(a|b)c$")
			attest<Regex<"ac" | "bc", { 1: "a" | "b" }>>(S).type.toString.snap()
		})

		it("empty start branch", () => {
			const S = regex("^|b$")
			attest<Regex<string>>(S).type.toString.snap()
		})

		it("empty end branch", () => {
			const S = regex("^a|$")
			attest<Regex<string>>(S).type.toString.snap()
		})

		it("empty middle branch", () => {
			const S = regex("^a||c$")
			attest<Regex<string>>(S).type.toString.snap()
		})
	})

	describe("wildcard", () => {
		it(".", () => {
			const S = regex("^a.$")
			attest<Regex<`a${string}`>>(S).type.toString.snap()
		})
		it("consecutive", () => {
			const S = regex("^a..c$")
			attest<Regex<`a${string}c`>>(S).type.toString.snap()
		})
	})

	describe("named capture groups", () => {
		it("basic", () => {
			const S = regex("^(?<foo>abc)$")
			attest<Regex<`abc`, { foo: `abc`; 1: `abc` }>>(S).type.toString.snap()
		})

		it("with quantifier", () => {
			const S = regex("^(?<foo>ab)+$")
			attest<Regex<`ab${string}`, { foo: `ab${string}`; 1: `ab${string}` }>>(
				S
			).type.toString.snap()
		})

		it("nested", () => {
			const S = regex("^(?<outer>a(?<inner>b)c)$")
			attest<Regex<`abc`, { outer: `abc`; 1: `abc`; inner: `b`; 2: `b` }>>(
				S
			).type.toString.snap()
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
			attest(() => regex("(?<>foo)")).type.errors.snap()
		})
	})

	describe("backreferences", () => {
		it("numeric basic", () => {
			const S = regex("^(a)b\\1$")
			attest<Regex<`aba`, { 1: "a" }>>(S).type.toString.snap()
		})

		it("numeric reference to current", () => {
			const S = regex("^(a\\1b)c\\1$")
			attest<Regex<`abcab`, { 1: `ab` }>>(S).type.toString.snap()
		})

		it("named basic", () => {
			const S = regex("^(?<foo>a)b\\k<foo>$")
			attest<Regex<`aba`, { foo: "a"; 1: "a" }>>(S).type.toString.snap()
		})

		it("numeric union group", () => {
			const S = regex("^(a|b)\\1$")
			attest<
				Regex<
					"ab" | "aa" | "ba" | "bb",
					{
						1: "a" | "b"
					}
				>
			>(S).type.toString.snap()
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
			>(S).type.toString.snap()
		})

		it("numeric quantified group", () => {
			const S = regex("^(a+)\\1$")
			attest<Regex<`a${string}`, { 1: `a${string}` }>>(S).type.toString.snap()
		})

		it("named quantified group", () => {
			const S = regex("^(?<foo>a+)\\k<foo>$")
			attest<Regex<`a${string}`, { foo: `a${string}`; 1: `a${string}` }>>(
				S
			).type.toString.snap()
		})

		it("missing reference", () => {
			// @ts-expect-error
			attest(() => regex("^(?<foo>a)b\\k$")).type.errors.snap()
		})
	})
})
