import { attest, contextualize } from "@ark/attest"
import { regex, type Regex } from "@ark/regex"
import { emptyCharacterSetMessage } from "@ark/regex/internal/charset.js"
import {
	caretNotationMessage,
	missingBackreferenceNameMessage,
	trailingBackslashMessage,
	writeStringEscapableMessage,
	writeUnnecessaryEscapeMessage,
	writeUnresolvableBackreferenceMessage
} from "@ark/regex/internal/escape.js"
import {
	missingNegatedModifierMessage,
	multipleModifierDashesMessage,
	unescapedLiteralQuestionMarkMessage,
	unnamedCaptureGroupMessage,
	writeDuplicateModifierMessage,
	writeInvalidModifierMessage
} from "@ark/regex/internal/group.js"
import type { next } from "@ark/regex/internal/parse.js"
import { writeUnmatchedQuantifierError } from "@ark/regex/internal/quantify.js"
import {
	writeIncompleteReferenceError,
	writeMidAnchorError,
	type finalizeTree,
	type GroupTree,
	type IndexedCaptureOffset,
	type ReferenceNode,
	type s,
	type SequenceTree,
	type State,
	type UnionTree
} from "@ark/regex/internal/state.js"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	type WhitespaceChar
} from "@ark/util"

type iterate<s extends State, until extends number, counter extends 1[] = []> =
	counter["length"] extends until ? s : iterate<next<s>, until, [...counter, 1]>

type _ParseResult = iterate<State.initialize<"[1-9]", "">, 1>
type _AstResult = State.Group.finalize<_ParseResult>
type _FinalizedResult = s.finalize<_ParseResult>

type _Tree = SequenceTree<
	[
		"<​^​>",
		GroupTree<
			UnionTree<
				[
					"0",
					SequenceTree<
						[
							UnionTree<["1", string]>,
							{
								kind: "quantifier"
								ast: `${bigint}`
								min: 0
								max: null
							}
						]
					>
				]
			>,
			State.UnnamedCaptureKind.indexed
		>,
		".",
		"<​$​>"
	]
>

type _Result = finalizeTree<
	_Tree,
	{ errors: []; flags: ""; captures: [IndexedCaptureOffset]; names: {} }
>

contextualize(() => {
	describe("literals", () => {
		it("base", () => {
			const S = regex("abc")
			attest<Regex<`${string}abc${string}`, {}>>(S).type.toString.snap(
				"Regex<`${string}abc${string}`, {}>"
			)
		})

		it("empty", () => {
			const S = regex("")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})
	})

	describe("anchors", () => {
		it("start", () => {
			const S = regex("^a")
			attest<Regex<`a${string}`, {}>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			)
		})

		it("end", () => {
			const S = regex("a$")
			attest<Regex<`${string}a`, {}>>(S).type.toString.snap(
				"Regex<`${string}a`, {}>"
			)
		})

		it("start and end", () => {
			const S = regex("^a$")
			attest<Regex<`a`, {}>>(S).type.toString.snap('Regex<"a", {}>')
		})

		it("multiple start branches", () => {
			const S = regex("^foo|^bar")
			attest<Regex<`foo${string}` | `bar${string}`, {}>>(S)
		})

		it("multiple end branches", () => {
			const S = regex("foo$|bar$")
			attest<Regex<`${string}foo` | `${string}bar`, {}>>(S)
		})

		it("mixed anchor branches", () => {
			const S = regex("^foo|bar$")
			attest<Regex<`foo${string}` | `${string}bar`, {}>>(S)
		})

		it("inner outer anchors", () => {
			const S = regex("(^bo(innerAnchored$|innerUnanchored))")
			attest<
				Regex<
					"boinnerAnchored" | `boinnerUnanchored${string}`,
					{
						captures:
							| ["boinnerAnchored", "innerAnchored"]
							| ["boinnerUnanchored", "innerUnanchored"]
					}
				>
			>(S)
		})

		it("consecutive start", () => {
			// @ts-expect-error
			attest(() => regex("^^")).type.errors(writeMidAnchorError("^"))
		})

		it("consecutive end", () => {
			// @ts-expect-error
			attest(() => regex("$$")).type.errors(writeMidAnchorError("$"))
		})

		it("start after first char", () => {
			// @ts-expect-error
			attest(() => regex("a^")).type.errors(writeMidAnchorError("^"))
		})

		it("end before last char", () => {
			// @ts-expect-error
			attest(() => regex("$a")).type.errors(writeMidAnchorError("$"))
		})

		it("invalid start anchor union", () => {
			// @ts-expect-error
			attest(() => regex("^f^oo|^bar")).type.errors(writeMidAnchorError("^"))
		})

		it("invalid end anchor union", () => {
			// @ts-expect-error
			attest(() => regex("^foo|^b$ar")).type.errors(writeMidAnchorError("$"))
		})

		it("start after first char in group", () => {
			// @ts-expect-error
			attest(() => regex("f(^)")).type.errors(writeMidAnchorError("^"))
		})

		it("end before last char in group", () => {
			// @ts-expect-error
			attest(() => regex("($a)")).type.errors(writeMidAnchorError("$"))
		})
	})

	describe("simple quantifiers", () => {
		it("?", () => {
			const S = regex("^ab?c$")
			attest<Regex<`a${"b" | ""}c`, {}>>(S)
		})

		it("? sequence", () => {
			const S = regex("^a?b?$")
			attest<Regex<"" | "a" | "b" | "ab", {}>>(S)
		})

		it("??", () => {
			const S = regex("^ab??c$")
			attest<Regex<`a${"b" | ""}c`, {}>>(S)
		})

		it("+", () => {
			const S = regex("^ab+c$")
			attest<Regex<`ab${string}c`, {}>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("+?", () => {
			const S = regex("^ab+?c$")
			attest<Regex<`ab${string}c`, {}>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("*", () => {
			const S = regex("^ab*c$")
			attest<Regex<"ac" | `ab${string}c`, {}>>(S)
		})

		it("*?", () => {
			const S = regex("^ab*?c$")
			attest<Regex<"ac" | `ab${string}c`, {}>>(S)
		})

		it("unmatched ?", () => {
			// @ts-expect-error
			attest(() => regex("?")).type.errors(writeUnmatchedQuantifierError("?"))
		})

		it("unmatched +", () => {
			// @ts-expect-error
			attest(() => regex("+")).type.errors(writeUnmatchedQuantifierError("+"))
		})

		it("unmatched *", () => {
			// @ts-expect-error
			attest(() => regex("*")).type.errors(writeUnmatchedQuantifierError("*"))
		})

		it("unmatched ??", () => {
			// @ts-expect-error
			attest(() => regex("??")).type.errors(writeUnmatchedQuantifierError("?"))
		})
	})

	describe("ranges", () => {
		it("exact", () => {
			const S = regex("^a{2}$")
			attest<Regex<"aa", {}>>(S).type.toString.snap('Regex<"aa", {}>')
		})

		it("min", () => {
			const S = regex("^a{2,}$")
			attest<Regex<`aa${string}`, {}>>(S).type.toString.snap(
				"Regex<`aa${string}`, {}>"
			)
		})

		it("min max", () => {
			const S = regex("^a{2,4}$")
			attest<Regex<"aa" | "aaa" | "aaaa", {}>>(S)
		})

		it("min max lazy", () => {
			const S = regex("^a{2,4}?$")
			attest<Regex<"aa" | "aaa" | "aaaa", {}>>(S)
		})

		it("min max group", () => {
			const S = regex("^(ab){1,2}$")
			attest<
				Regex<
					"ab" | "abab",
					{
						captures: ["ab"]
					}
				>
			>(S)
		})

		it("zero or more greedy", () => {
			const S = regex("^a{0,}$")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("zero or more lazy", () => {
			const S = regex("^a{0,}?$")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("zero or one", () => {
			const S = regex("^a{0,1}$")
			attest<Regex<"" | "a", {}>>(S)
		})

		it("zero or one lazy", () => {
			const S = regex("^a{0,1}?$")
			attest<Regex<"" | "a", {}>>(S)
		})

		it("falls back to literal for missing min", () => {
			const r = regex("^a{,2}$")
			attest<Regex<"a{,2}", {}>>(r).type.toString.snap('Regex<"a{,2}", {}>')
		})

		it("fallsback to literal on empty", () => {
			const r = regex("^a{}$")
			attest<Regex<"a{}", {}>>(r).type.toString.snap('Regex<"a{}", {}>')
		})

		it("falls back to literal for non-numeric", () => {
			const r = regex("^a{1,foo}$")
			attest<Regex<"a{1,foo}", {}>>(r).type.toString.snap(
				'Regex<"a{1,foo}", {}>'
			)
		})

		it("${string} does not duplicate when quantified", () => {
			const r = regex("^.{5,10}$")
			attest<Regex<string, {}>>(r).type.toString.snap("Regex<string, {}>")
		})

		it("many ranges", () => {
			const S = regex("^x{0}a{1}b{2}c{3}d{3,}e{1,2}f{4}$")
			attest<Regex<`abbcccddd${string}effff` | `abbcccddd${string}eeffff`, {}>>(
				S
			)
		})

		it("unmatched", () => {
			// @ts-expect-error
			attest(() => regex("{2}")).type.errors(
				writeUnmatchedQuantifierError("{2}")
			)
		})

		it("unmatched comma", () => {
			// @ts-expect-error
			attest(() => regex("{2,}")).type.errors(
				writeUnmatchedQuantifierError("{2,}")
			)
		})

		it("unmatched min max", () => {
			// @ts-expect-error
			attest(() => regex("{2,3}")).type.errors(
				writeUnmatchedQuantifierError("{2,3}")
			)
		})

		it("unmatched lazy", () => {
			// @ts-expect-error
			attest(() => regex("{2,3}?")).type.errors(
				writeUnmatchedQuantifierError("{2,3}?")
			)
		})
	})

	describe("character sets", () => {
		it("literals", () => {
			const S = regex("^a[abc]$")
			attest<Regex<`a${"a" | "b" | "c"}`, {}>>(S)
		})

		it("ranges", () => {
			const S = regex("^a[x-z]$")
			attest<Regex<`a${string}`, {}>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			) // ranges widen to string for now
		})

		it("range tree", () => {
			// was previously incorrectly inferred as UnionTree<["1", string]>
			type Tree = State.Group.finalize<
				iterate<State.initialize<"[1-9]", "">, 1>
			>
			attest<string, Tree>()
		})

		it("literal dash start", () => {
			const S = regex("^a[-abc]$")
			attest<Regex<`a${"-" | "a" | "b" | "c"}`, {}>>(S)
		})

		it("literal dash end", () => {
			const S = regex("^a[abc-]$")
			attest<Regex<`a${"a" | "b" | "c" | "-"}`, {}>>(S)
		})

		it("literal dash post range", () => {
			type Tree = State.Group.finalize<
				iterate<State.initialize<"[a-z-Z]", "">, 1>
			>
			attest<UnionTree<[string, "-", "Z"]>, Tree>()

			const S = regex("[a-z-Z]")
			attest<Regex<string, {}>>(S)
		})

		it("escaped dash", () => {
			const S = regex("^a[a\\-c]$")
			attest<Regex<`a${"a" | "-" | "c"}`, {}>>(S)
		})

		it("escaped caret", () => {
			const S = regex("^a[\\^bc]$")
			attest<Regex<`a${"^" | "b" | "c"}`, {}>>(S)
		})

		it("escaped closing bracket", () => {
			const S = regex("^a[bc\\]]$")
			attest<Regex<`a${"b" | "c" | "]"}`, {}>>(S)
		})

		it("escaped backslash", () => {
			const S = regex("^a[bc\\\\]$")
			attest<Regex<`a${"b" | "c" | "\\"}`, {}>>(S)
		})

		it("negated", () => {
			const S = regex("^a[^abc]$")
			// always widens to string, inner contents not parsed
			attest<Regex<`a${string}`, {}>>(S).type.toString.snap(
				"Regex<`a${string}`, {}>"
			)
		})

		it("shorthand", () => {
			const S = regex("^a[\\d]$")
			attest<Regex<`a${bigint}`, {}>>(S).type.toString.snap(
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
			attest(() => regex("[]")).type.errors(emptyCharacterSetMessage)
		})
	})

	describe("escapes", () => {
		it("\\w", () => {
			const S = regex("^a\\wc$")
			attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\d", () => {
			const S = regex("^a\\dc$")
			attest<Regex<`a${bigint}c`, {}>>(S).type.toString.snap(
				"Regex<`a${bigint}c`, {}>"
			)
		})

		it("\\s", () => {
			const S = regex("^a\\sc$")
			attest<Regex<`a${WhitespaceChar}c`, {}>>(S)
		})

		it("\\W", () => {
			const S = regex("^a\\Wc$")
			attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\D", () => {
			const S = regex("^a\\Dc$")
			attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("\\S", () => {
			const S = regex("^a\\Sc$")
			attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
		})

		it("escaped quantifier", () => {
			const S = regex("^a\\?c$")
			attest<Regex<`a?c`, {}>>(S)
		})

		it("escaped anchor", () => {
			const S = regex("^a\\^c$")
			attest<Regex<`a^c`, {}>>(S)
		})

		it("escaped group delimiter", () => {
			const S = regex("^a\\(c$")
			attest<Regex<`a(c`, {}>>(S)
		})

		it("escaped charset delimiter", () => {
			const S = regex("^a\\[c$")
			attest<Regex<`a[c`, {}>>(S)
		})

		it("escaped alternator", () => {
			const S = regex("^a\\|c$")
			attest<Regex<`a|c`, {}>>(S)
		})

		it("escaped wildcard", () => {
			const S = regex("^a\\.c$")
			attest<Regex<`a.c`, {}>>(S)
		})

		it("escaped backslash", () => {
			const S = regex("^a\\\\c$")
			attest<Regex<`a\\c`, {}>>(S)
		})

		it("unnecessary escape", () => {
			// @ts-expect-error
			attest(() => regex("\\a")).type.errors(writeUnnecessaryEscapeMessage("a"))
		})

		it("trailing escape", () => {
			// @ts-expect-error
			attest(() => regex("abc\\")).type.errors(trailingBackslashMessage)
		})

		it("\\b", () => {
			const S = regex("^word\\b$")
			attest<Regex<`word`, {}>>(S)
		})

		it("\\B", () => {
			const S = regex("^word\\B$")
			attest<Regex<`word`, {}>>(S)
		})

		it("builtin escapes", () => {
			const S = regex("^\t\n\r\v\f\0$")
			attest<Regex<"\t\n\r\v\f\0", {}>>(S)
		})

		it("string escapable char", () => {
			// @ts-expect-error
			attest(() => regex("\\n")).type.errors(writeStringEscapableMessage("n"))
		})

		it("hex escape", () => {
			const S = regex("^a\x62c$")
			attest<Regex<"abc", {}>>(S).type.toString.snap('Regex<"abc", {}>')
		})

		it("string escapable hex", () => {
			// @ts-expect-error
			attest(() => regex("^a\\x62c$")).type.errors(
				writeStringEscapableMessage("x")
			)
		})

		it("unicode escape (4 digit)", () => {
			const S = regex("^a\u0062c$")
			attest<Regex<"abc", {}>>(S).type.toString.snap('Regex<"abc", {}>')
		})

		it("string escapable unicode", () => {
			// @ts-expect-error
			attest(() => regex("^a\\u0062c$")).type.errors(
				writeStringEscapableMessage("u")
			)
		})

		it("unicode escape (braced)", () => {
			const S = regex("^a\u{62}c$")
			attest<Regex<"abc", {}>>(S).type.toString.snap('Regex<"abc", {}>')
		})

		it("unicode escape (braced multi-digit)", () => {
			const S = regex("^a\u{00000062}c$")
			attest<Regex<"abc", {}>>(S).type.toString.snap('Regex<"abc", {}>')
		})

		it("caret notation error", () => {
			// @ts-expect-error
			attest(() => regex("\\cA")).type.errors(caretNotationMessage)
		})
	})

	describe("groups", () => {
		it("capturing", () => {
			const S = regex("^(a(b)c)$")
			attest<
				Regex<
					`abc`,
					{
						captures: ["abc", "b"]
					}
				>
			>(S)
		})

		it("non-capturing", () => {
			const S = regex("^(a(?:b)c)$")
			attest<
				Regex<
					`abc`,
					{
						captures: ["abc"]
					}
				>
			>(S).type.toString.snap('Regex<"abc", { captures: ["abc"] }>')
		})

		it("optional capture group includes undefined", () => {
			const S = regex("^(a)?$")
			attest<
				Regex<
					"" | "a",
					{
						captures: ["a" | undefined]
					}
				>
			>(S)
		})

		it("inner optional capture group includes undefined", () => {
			const S = regex("^a(b(c)d)?e$")
			attest<
				Regex<
					"ae" | "abcde",
					{
						// or...
						// ["bcd", "c"] | [undefined, undefined]
						captures: ["bcd" | undefined, "c" | undefined]
					}
				>
			>(S)
		})

		it("quantified capture group including 0 includes undefined", () => {
			const S = regex("^(a){0,1}$")
			attest<
				Regex<
					"" | "a",
					{
						captures: ["a" | undefined]
					}
				>
			>(S)
		})

		it("quantified", () => {
			const S = regex("^a(?:b)+c$")
			attest<Regex<`ab${string}c`, {}>>(S).type.toString.snap(
				"Regex<`ab${string}c`, {}>"
			)
		})

		it("nested", () => {
			const S = regex("^(a(b(c)))$")
			attest<
				Regex<
					`abc`,
					{
						captures: ["abc", "bc", "c"]
					}
				>
			>(S)
		})

		it("unclosed", () => {
			// @ts-expect-error
			attest(() => regex("(abc")).type.errors(writeUnclosedGroupMessage(")"))
		})

		it("unmatched", () => {
			// @ts-expect-error
			attest(() => regex("abc)")).type.errors(
				writeUnmatchedGroupCloseMessage(")", "")
			)
		})

		it("empty", () => {
			const S = regex("()")
			attest<
				Regex<
					`${string}${string}`,
					{
						captures: [""]
					}
				>
			>(S).type.toString.snap('Regex<string, { captures: [""] }>')
		})

		it("unescaped literal question mark", () => {
			// @ts-expect-error
			attest(() => regex("(?ab)")).type.errors(
				unescapedLiteralQuestionMarkMessage
			)
		})
	})

	describe("union", () => {
		it("basic", () => {
			const S = regex("^a|b$")
			attest<Regex<`a${string}` | `${string}b`, {}>>(S)
		})

		it("multiple", () => {
			const S = regex("^a|b|c$")
			attest<Regex<`a${string}` | `${string}b${string}` | `${string}c`, {}>>(S)
		})

		it("within group", () => {
			const S = regex("^(a|b)c$")
			attest<
				Regex<
					"ac" | "bc",
					{
						captures: ["a"] | ["b"]
					}
				>
			>(S)
		})

		it("empty start branch", () => {
			const S = regex("^|b$")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("empty end branch", () => {
			const S = regex("^a|$")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})

		it("empty middle branch", () => {
			const S = regex("^a||c$")
			attest<Regex<string, {}>>(S).type.toString.snap("Regex<string, {}>")
		})
	})

	it(".", () => {
		const S = regex("^a.$")
		attest<Regex<`a${string}`, {}>>(S)
	})

	it("consecutive .", () => {
		const S = regex("^a..c$")
		// collapsed to single {string}
		attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
			"Regex<`a${string}c`, {}>"
		)
	})

	describe("index backreferences", () => {
		it("basic", () => {
			const S = regex("^(a)b\\1$")
			attest<
				Regex<
					`aba`,
					{
						captures: ["a"]
					}
				>
			>(S).type.toString.snap('Regex<"aba", { captures: ["a"] }>')
		})

		it("union", () => {
			const S = regex("^(a|b)\\1$")
			attest<
				Regex<
					"aa" | "bb",
					{
						captures: ["a"] | ["b"]
					}
				>
			>(S).type.toString.snap()
		})

		it("branching captures", () => {
			const S = regex("^((a)|b)$")
			attest<
				Regex<
					"a" | "b",
					{
						captures: ["a", "a"] | ["b", undefined]
					}
				>
			>(S).type.toString.snap('Regex<"aa" | "bb", { captures: ["a" | "b"] }>')
		})

		it("branching named captures", () => {
			const S = regex("^(?<foo>(?<bar>a)|b)$")
			attest<
				Regex<
					"a" | "b",
					{
						captures: ["a", "a"] | ["b", undefined]
						names:
							| {
									foo: "a"
									bar: "a"
							  }
							| {
									foo: "b"
									bar: undefined
							  }
					}
				>
			>(S).type.toString.snap('Regex<"aa" | "bb", { captures: ["a" | "b"] }>')
		})

		it("anchored ref", () => {
			const S = regex("(^f)")
			attest<
				Regex<
					`f${string}`,
					{
						captures: ["f"]
					}
				>
			>(S)
		})

		it("incomplete reference", () => {
			// @ts-expect-error
			attest(() => regex("^(a\\1b)c\\1$")).type.errors(
				writeIncompleteReferenceError("1")
			)
		})

		it("inner quantified", () => {
			const S = regex("^(a+)\\1$")
			attest<
				Regex<
					`a${string}a${string}`,
					{
						captures: [`a${string}`]
					}
				>
			>(S)
		})

		it("group quantified", () => {
			const S = regex("^(a)+\\1$")
			attest<
				Regex<
					`a${string}a`,
					{
						captures: ["a"]
					}
				>
			>(S)
		})

		it("ref quantified", () => {
			const S = regex("^(a)\\1+$")
			attest<
				Regex<
					`aa${string}`,
					{
						captures: ["a"]
					}
				>
			>(S)
		})

		it("multiple refs", () => {
			const S = regex("^a(?<foo>b(c)d)?e\\1\\2?$")

			attest<
				Regex<
					"abcdebcd" | "abcdebcdc" | "ae",
					{
						captures: ["bcd", "c"] | [undefined, undefined]
						names:
							| {
									foo: "bcd"
							  }
							| {
									foo: undefined
							  }
					}
				>
			>(S).type.toString.snap()
		})

		it("index out of range", () => {
			// @ts-expect-error
			attest(() => regex("(a)b\\2")).type.errors(
				writeUnresolvableBackreferenceMessage("2")
			)
		})

		it("index 0 (invalid backreference)", () => {
			// @ts-expect-error
			attest(() => regex("abc\\0")).type.errors(
				writeStringEscapableMessage("0")
			)
		})

		it("escaped octal error", () => {
			// just gives based \\0 error message since it is not mentioned in
			// MDN docs even though it is technically valid JS.

			// @ts-expect-error
			attest(() => regex("\\07")).type.errors(writeStringEscapableMessage("0"))
		})
	})

	describe("named backreference", () => {
		it("unreferenced", () => {
			const S = regex("^(?<foo>abc)$")
			attest<
				Regex<
					`abc`,
					{
						captures: ["abc"]
						names: {
							foo: "abc"
						}
					}
				>
			>(S)
		})

		it("anchored ref", () => {
			const S = regex("(?<anchored>^f)$")
			attest<
				Regex<
					"f",
					{
						captures: ["f"]
						names: {
							anchored: "f"
						}
					}
				>
			>(S)
		})

		it("simple reference", () => {
			const S = regex("^(?<foo>a)b\\k<foo>$")
			attest<
				Regex<
					`aba`,
					{
						captures: ["a"]
						names: {
							foo: "a"
						}
					}
				>
			>(S)
		})

		it("nested", () => {
			const S = regex("^(?<outer>a(?<inner>b)c)\\k<outer>\\k<inner>$")
			attest<
				Regex<
					"abcabcb",
					{
						captures: ["abc", "b"]
						names: {
							outer: "abc"
							inner: "b"
						}
					}
				>
			>(S)
		})

		it("incomplete reference", () => {
			// @ts-expect-error
			attest(() => regex("^(?<foo>a\\k<foo>b)c\\k<foo>$")).type.errors(
				writeIncompleteReferenceError("foo")
			)
		})

		it("inner quantified group", () => {
			const S = regex("^(?<foo>a+)\\k<foo>$")
			attest<
				Regex<
					`a${string}a${string}`,
					{
						captures: [`a${string}`]
						names: {
							foo: `a${string}`
						}
					}
				>
			>(S)
		})

		it("group quantified", () => {
			const S = regex("^(?<foo>a)+\\k<foo>$")
			attest<
				Regex<
					`a${string}a`,
					{
						captures: ["a"]
						names: {
							foo: "a"
						}
					}
				>
			>(S)
		})

		it("ref quantified", () => {
			const S = regex("^(?<foo>a)\\k<foo>+$")
			attest<
				Regex<
					`aa${string}`,
					{
						captures: ["a"]
						names: {
							foo: "a"
						}
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
						captures: ["a" | "b"]
						names: {
							foo: "a" | "b"
						}
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
			attest(() => regex("(?<>foo)")).type.errors(unnamedCaptureGroupMessage)
		})

		it("unresolvable", () => {
			// @ts-expect-error
			attest(() => regex("(?<foo>a)b\\k<bar>")).type.errors(
				writeUnresolvableBackreferenceMessage("bar")
			)
		})

		it("forward reference", () => {
			// @ts-expect-error
			attest(() => regex("\\k<foo>(?<foo>a)")).type.errors(
				writeUnresolvableBackreferenceMessage("foo")
			)
		})

		it("missing reference", () => {
			// @ts-expect-error
			attest(() => regex("^(?<foo>a)b\\k$")).type.errors(
				missingBackreferenceNameMessage
			)
		})

		it("\\k< without name", () => {
			// @ts-expect-error
			attest(() => regex("\\k<>")).type.errors(
				writeUnresolvableBackreferenceMessage("")
			)
		})
	})

	describe("lookarounds", () => {
		it("positive", () => {
			const S = regex("^a(?=b)b$")
			attest<Regex<"ab", {}>>(S)
		})

		it("negative", () => {
			const S = regex("^a(?!c)b$")
			attest<Regex<"ab", {}>>(S)
		})

		it("nested", () => {
			const S = regex("^a(?=b(?!d)c)bc$")
			attest<Regex<"abc", {}>>(S)
		})

		it("quantified lookahead", () => {
			// @ts-expect-error
			attest(() => regex("^a(?=b)?b$")).type.errors(
				writeUnmatchedQuantifierError("?")
			)
		})

		it("unclosed lookahead", () => {
			// @ts-expect-error
			attest(() => regex("a(?=b")).type.errors(writeUnclosedGroupMessage(")"))
		})

		it("positive", () => {
			const S = regex("^a(?<=a)b$")
			attest<Regex<"ab", {}>>(S).type.toString.snap('Regex<"ab", {}>')
		})

		it("negative", () => {
			const S = regex("^a(?<!b)c$")
			attest<Regex<"ac", {}>>(S).type.toString.snap('Regex<"ac", {}>')
		})

		it("nested", () => {
			const S = regex("^abc(?<=b(?<!d)c)$")
			attest<Regex<"abc", {}>>(S).type.toString.snap('Regex<"abc", {}>')
		})

		it("unclosed lookbehind", () => {
			// @ts-expect-error
			attest(() => regex("(?<=ab")).type.errors(writeUnclosedGroupMessage(")"))
		})
	})

	describe("flags", () => {
		it("empty string", () => {
			const S = regex("^aB$", "")
			attest<Regex<"aB", {}>>(S)
		})

		it("i", () => {
			const S = regex("^aB$", "i")
			attest<Regex<"aB" | "ab" | "Ab" | "AB", { flags: "i" }>>(S)
		})
	})

	describe("modifiers", () => {
		it("i enable", () => {
			const S = regex("^a(?i:bC)d$")
			attest<Regex<"abcd" | "abCd" | "aBcd" | "aBCd", {}>>(S)
		})

		it("i disable", () => {
			const S = regex("^(?-i:aB)$")
			attest<Regex<"aB", {}>>(S)
		})

		it("i enable overrides global i disable", () => {
			const S = regex("^(?i:aB)$", "")
			attest<Regex<"aB" | "ab" | "Ab" | "AB", {}>>(S)
		})

		it("i disable overrides global i enable", () => {
			const S = regex("^(?-i:aB)$", "i")
			attest<Regex<"aB", { flags: "i" }>>(S)
		})

		it("i enable with global i enable", () => {
			const S = regex("^(?i:aB)$", "i")
			attest<Regex<"aB" | "ab" | "Ab" | "AB", { flags: "i" }>>(S)
		})

		it("i disable with global i disable", () => {
			const S = regex("^(?-i:aB)$", "")
			attest<Regex<"aB", {}>>(S)
		})

		it("nested enable/disable", () => {
			const S = regex("^(?i:a(?-i:B)c)$")
			attest<Regex<"aBc" | "aBC" | "ABc" | "ABC", {}>>(S)
		})

		it("nested disable/enable", () => {
			const S = regex("^(?-i:a(?i:B)c)$")
			attest<Regex<"aBc" | "abc", {}>>(S)
		})

		it("multiple modifiers enable i", () => {
			const S = regex("^(?im:aB)$")
			attest<Regex<"aB" | "ab" | "Ab" | "AB", {}>>(S)
		})

		it("multiple modifiers disable i", () => {
			const S = regex("^(?-im:aB)$")
			attest<Regex<"aB", {}>>(S)
		})

		it("multiple modifiers enable/disable i", () => {
			const S = regex("^(?i-m:aB)$")
			attest<Regex<"aB" | "ab" | "Ab" | "AB", {}>>(S)
		})

		it("duplicate conflicting modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?m-m:.*)")).type.errors(
				writeDuplicateModifierMessage("m")
			)
		})

		it("duplicate positive modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?mm:.*)")).type.errors(
				writeDuplicateModifierMessage("m")
			)
		})

		it("duplicate negated modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?-mm:.*)")).type.errors(
				writeDuplicateModifierMessage("m")
			)
		})

		it("multiple dashes", () => {
			// @ts-expect-error
			attest(() => regex("^(?-i-m:aB)$")).type.errors(
				multipleModifierDashesMessage
			)
		})

		it("invalid modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?x:abc)")).type.errors(
				writeInvalidModifierMessage("x")
			)
		})

		it("invalid negated modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?-x:abc)")).type.errors(
				writeInvalidModifierMessage("x")
			)
		})

		it("missing negated modifier", () => {
			// @ts-expect-error
			attest(() => regex("(?-:abc)")).type.errors(missingNegatedModifierMessage)
		})

		it("unclosed modifier group", () => {
			// @ts-expect-error
			attest(() => regex("(?i")).type.errors(writeUnclosedGroupMessage(")"))
		})

		it("modifier group without colon", () => {
			// @ts-expect-error
			attest(() => regex("(?i)")).type.errors(
				unescapedLiteralQuestionMarkMessage
			)
		})

		it("modifier group with colon but no content", () => {
			const S = regex("^(?i:)$")
			attest<Regex<"", {}>>(S)
		})
	})

	it("combinatorial", () => {
		const S = regex("^ab?c?d?e?f?g?h?i?j?k?l?m?n?o?$")
		type Expected =
			`a${"b" | ""}${"c" | ""}${"d" | ""}${"e" | ""}${"f" | ""}${"g" | ""}${"h" | ""}${"i" | ""}${"j" | ""}${"k" | ""}${"l" | ""}${"m" | ""}${"n" | ""}${"o" | ""}`
		attest<Regex<Expected, {}>>(S)
	})

	it("semver", () => {
		const S = regex("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$")

		type ExpectedPattern =
			| `0.0.${string}`
			| `0.${string}.0`
			| `0.${string}.${string}`
			| `${string}.0.0`
			| `${string}.0.${string}`
			| `${string}.${string}.0`
			| `${string}.${string}.${string}`

		attest<
			Regex<
				ExpectedPattern,
				{
					captures: [string, string, string]
				}
			>
		>(S)
	})
})
