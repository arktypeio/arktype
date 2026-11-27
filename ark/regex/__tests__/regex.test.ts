import { attest, contextualize } from "@ark/attest"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "@ark/util"
import { regex, type Regex } from "arkregex"
import {
	emptyCharacterSetMessage,
	invalidClassRangeMessage,
	invalidClassStringDisjunctionMessage,
	invalidDecimalEscapeMessage,
	loneClosingBracketMessage,
	writeOutOfOrderRangeMessage
} from "arkregex/internal/charset.ts"
import {
	caretNotationMessage,
	missingBackreferenceNameMessage,
	trailingBackslashMessage,
	writeInvalidUnicodePropertyMessage,
	writeStringEscapableMessage,
	writeUnicodePropertyRequiresFlagMessage,
	writeUnnecessaryEscapeMessage,
	writeUnresolvableBackreferenceMessage
} from "arkregex/internal/escape.ts"
import {
	missingNegatedModifierMessage,
	multipleModifierDashesMessage,
	unescapedLiteralQuestionMarkMessage,
	unnamedCaptureGroupMessage,
	writeDuplicateModifierMessage,
	writeInvalidCaptureGroupNameMessage,
	writeInvalidModifierMessage
} from "arkregex/internal/group.ts"
import type { next } from "arkregex/internal/parse.ts"
import {
	incompleteQuantifierMessage,
	loneClosingBraceMessage,
	writeMinExceedsMaxQuantifierError,
	writeUnmatchedQuantifierError,
	writeUnnaturalNumberQuantifierError
} from "arkregex/internal/quantify.ts"
import {
	mutuallyExclusiveUnicodeFlagsMessage,
	writeDuplicateFlagMessage,
	writeInvalidFlagMessage
} from "arkregex/internal/regex.ts"
import {
	writeDuplicateCaptureGroupNameError,
	writeIncompleteReferenceError,
	writeMidAnchorError,
	type finalizeTree,
	type GroupTree,
	type IndexedCaptureOffset,
	type s,
	type SequenceTree,
	type State,
	type UnionTree
} from "arkregex/internal/state.ts"

type iterate<s extends State, until extends number, counter extends 1[] = []> =
	counter["length"] extends until ? s : iterate<next<s>, until, [...counter, 1]>

type _ParseResult = iterate<State.initialize<"^\\d\\d$", "">, 4>
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
								ast: `${number}`
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
	{
		errors: []
		flags: ""
		captures: [IndexedCaptureOffset]
		names: {}
		priorBranchNames: never
	}
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

		it("unanchored digit classes preserve surrounding ${string}", () => {
			const D = regex("\\d")
			attest<Regex<`${string}${number}${string}`, {}>>(D)
			attest(D.test("foo5bar")).equals(true)

			const Range = regex("[0-9]")
			attest<Regex<`${string}${number}${string}`, {}>>(Range)

			const Multiline = regex("\\d$", "m")
			attest<Regex<`${string}${number}${string}`, { flags: "m" }>>(Multiline)

			const Start = regex("^\\d")
			attest<Regex<`${number}${string}`, {}>>(Start)
			const okStart: typeof Start.infer = "5bar"
			attest(Start.test(okStart)).equals(true)

			const End = regex("\\d$")
			attest<Regex<`${string}${number}`, {}>>(End)

			const DigitFollowedByDot = regex("^(\\d).$")
			attest<Regex<`${number}${string}`, { captures: [`${number}`] }>>(
				DigitFollowedByDot
			)

			const DigitFollowedByUnion = regex("^(\\d)[a\\d]$")
			attest<
				Regex<`${number}a` | `${number}${number}`, { captures: [`${number}`] }>
			>(DigitFollowedByUnion)
		})

		it("does not emit redundant adjacent ${string}${string}", () => {
			const Plus = regex("^a+")
			attest<Regex<`a${string}`, {}>>(Plus).type.toString.snap(
				"Regex<`a${string}`, {}>"
			)
			const okPlus: typeof Plus.infer = "a"
			attest(Plus.test(okPlus)).equals(true)

			const UnanchoredPlus = regex("a+")
			attest<Regex<`${string}a${string}`, {}>>(UnanchoredPlus)
			const okUnanchored: typeof UnanchoredPlus.infer = "a"
			attest(UnanchoredPlus.test(okUnanchored)).equals(true)

			const LeadingWildcard = regex(".*a$")
			attest<Regex<`${string}a`, {}>>(LeadingWildcard)
			const okLeading: typeof LeadingWildcard.infer = "a"
			attest(LeadingWildcard.test(okLeading)).equals(true)

			const NestedPlus = regex("^(a+)+$")
			attest<Regex<`a${string}`, { captures: [`a${string}`] }>>(NestedPlus)
			const okNested: typeof NestedPlus.infer = "a"
			attest(NestedPlus.test(okNested)).equals(true)

			const NestedStar = regex("^(a+)*$")
			attest<
				Regex<"" | `a${string}`, { captures: [`a${string}` | undefined] }>
			>(NestedStar)
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

		// https://github.com/arktypeio/arktype/issues/1625
		it("* over a digit class allows the empty string", () => {
			const S = regex("^(\\d*)$")
			attest<Regex<string, { captures: [string] }>>(S)
		})

		// https://github.com/arktypeio/arktype/issues/1663
		it("unbounded digits overflow ${number}", () => {
			const S = regex("^\\d+$")
			attest<Regex<string, {}>>(S)
			attest<Regex<`${number}`, {}>>(regex("^\\d{1,3}$"))
		})

		it("bounded union including digits keeps its other branches", () => {
			const S = regex("^(?:a|\\d){2}$")
			attest<
				Regex<"aa" | `${number}${number}` | `${number}a` | `a${number}`, {}>
			>(S)
		})

		it("? over a digit class allows the empty string", () => {
			const S = regex("^(\\d?)$")
			attest<Regex<"" | `${number}`, { captures: ["" | `${number}`] }>>(S)
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
			attest<Regex<"" | `a${string}`, {}>>(S)
		})

		it("zero or more lazy", () => {
			const S = regex("^a{0,}?$")
			attest<Regex<"" | `a${string}`, {}>>(S)
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

		it("rejects incomplete quantifiers under u and v flags", () => {
			// @ts-expect-error
			attest(() => regex("^a{,2}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
			// @ts-expect-error
			attest(() => regex("^a{,2}$", "v"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
			// @ts-expect-error
			attest(() => regex("^a{}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
		})

		it("rejects lone closing brace under u and v flags", () => {
			// @ts-expect-error
			attest(() => regex("}", "u"))
				.throws("Lone quantifier brackets")
				.type.errors(loneClosingBraceMessage)
			// @ts-expect-error
			attest(() => regex("}", "v"))
				.throws("Lone quantifier brackets")
				.type.errors(loneClosingBraceMessage)
			attest<Regex<"}", { flags: "u" }>>(regex("^\\}$", "u"))
			attest<Regex<"}", {}>>(regex("^}$"))
		})

		it("rejects lone closing bracket under u and v flags", () => {
			// @ts-expect-error
			attest(() => regex("]", "u"))
				.throws("Lone quantifier brackets")
				.type.errors(loneClosingBracketMessage)
			// @ts-expect-error
			attest(() => regex("]", "v"))
				.throws("Lone quantifier brackets")
				.type.errors(loneClosingBracketMessage)
			attest<Regex<"]", { flags: "u" }>>(regex("^\\]$", "u"))
			attest<Regex<"]", {}>>(regex("^]$"))
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

		it("quantified charset", () => {
			const S = regex("^[ab]{2}$")
			attest<Regex<"aa" | "ab" | "ba" | "bb">>(S)
		})

		it("quantified union group", () => {
			const S = regex("^(a|b){2}$")
			attest<Regex<"aa" | "ab" | "ba" | "bb", { captures: ["a"] | ["b"] }>>(S)
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

		it("leading zeroes", () => {
			// @ts-expect-error
			attest(() => regex("^a{002}$")).type.errors(
				writeUnnaturalNumberQuantifierError("{002}")
			)
		})

		it("negative number falls back to literal unless u or v flag is set", () => {
			const S = regex("^a{-1}$")
			attest<Regex<"a{-1}", {}>>(S)
			attest(S.test("a{-1}")).equals(true)

			// @ts-expect-error
			attest(() => regex("^a{-1}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
		})

		it("decimal number falls back to literal unless u or v flag is set", () => {
			const S = regex("^a{1.5}$")
			attest<Regex<`a{1${string}5}`, {}>>(S)
			attest(S.test("a{1.5}")).equals(true)
			attest(S.test("a{1x5}")).equals(true)

			const EscapedDot = regex("^a{1\\.5}$")
			attest<Regex<"a{1.5}", {}>>(EscapedDot)

			// @ts-expect-error
			attest(() => regex("^a{1.5}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
		})

		it("spaced number falls back to literal unless u or v flag is set", () => {
			const S = regex("^a{ 1}$")
			attest<Regex<"a{ 1}", {}>>(S)
			attest(S.test("a{ 1}")).equals(true)

			// @ts-expect-error
			attest(() => regex("^a{ 1}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
		})

		it("non-decimal numeric literals fall back to literal unless u or v flag is set", () => {
			const Hex = regex("^a{0x10}$")
			attest<Regex<"a{0x10}", {}>>(Hex)
			attest(Hex.test("a{0x10}")).equals(true)
			attest(Hex.test("a".repeat(16))).equals(false)

			attest<Regex<"a{0b10}", {}>>(regex("^a{0b10}$"))
			attest<Regex<"a{0o10}", {}>>(regex("^a{0o10}$"))
			attest<Regex<"a{1e2}", {}>>(regex("^a{1e2}$"))
			attest<Regex<"a{0x10,2}", {}>>(regex("^a{0x10,2}$"))
			attest<Regex<"a{1,0x10}", {}>>(regex("^a{1,0x10}$"))
			attest<Regex<"{0x10}", {}>>(regex("^{0x10}$"))

			// @ts-expect-error
			attest(() => regex("^a{0x10}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
			// @ts-expect-error
			attest(() => regex("^a{0x10}$", "v"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
			// @ts-expect-error
			attest(() => regex("^a{0x10,2}$", "u"))
				.throws("Incomplete quantifier")
				.type.errors(incompleteQuantifierMessage)
		})

		it("equal min and max", () => {
			attest<Regex<"aa", {}>>(regex("^a{2,2}$"))
			attest<Regex<"", {}>>(regex("^a{0,0}$"))
		})

		it("double lazy question mark", () => {
			// @ts-expect-error
			attest(() => regex("^a{1,2}??$")).type.errors(
				writeUnmatchedQuantifierError("?")
			)
			// @ts-expect-error
			attest(() => regex("^a{2}??$")).type.errors(
				writeUnmatchedQuantifierError("?")
			)
			// @ts-expect-error
			attest(() => regex("^a{1,}??$")).type.errors(
				writeUnmatchedQuantifierError("?")
			)
		})

		it("min exceeds max", () => {
			// @ts-expect-error
			attest(() => regex("^a{3,1}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{3,1}")
			)
			// @ts-expect-error
			attest(() => regex("^a{3,1}?$")).type.errors(
				writeMinExceedsMaxQuantifierError("{3,1}?")
			)
			// @ts-expect-error
			attest(() => regex("^a{10,2}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{10,2}")
			)
			// @ts-expect-error
			attest(() => regex("^a{1,0}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{1,0}")
			)
			// @ts-expect-error
			attest(() => regex("^.{3,1}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{3,1}")
			)
			// @ts-expect-error
			attest(() => regex("^\\d{3,1}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{3,1}")
			)
			// @ts-expect-error
			attest(() => regex("^a{100000,99999}$")).type.errors(
				writeMinExceedsMaxQuantifierError("{100000,99999}")
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
			attest<`${number}`, Tree>()
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
				iterate<State.initialize<"[0-9-Z]", "">, 1>
			>
			attest<"-" | "Z" | `${number}`, Tree>()

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

		it("escaped backspace", () => {
			const S = regex("^[\\b]$")
			attest<Regex<"\b", {}>>(S).type.toString.snap('Regex<"\\b", {}>')
		})

		it("escapes unnecessary outside a set", () => {
			const S = regex("^[\\/\\n.]$")
			attest<Regex<"/" | "\n" | ".", {}>>(S)
		})

		it("legacy octal escape", () => {
			const S = regex("^[\\1]$")
			attest<Regex<string, {}>>(S)
		})

		it("identity escape with the u flag", () => {
			attest<Regex<"a", {}>>(regex("^[\\a]$"))
			// @ts-expect-error
			attest(() => regex("^[\\a]$", "u")).type.errors(
				writeUnnecessaryEscapeMessage("a")
			)
		})

		it("negated charset validates escapes under u and v flags", () => {
			// @ts-expect-error
			attest(() => regex("^[^\\a]$", "u"))
				.throws("Invalid escape")
				.type.errors(writeUnnecessaryEscapeMessage("a"))
			// @ts-expect-error
			attest(() => regex("^[^\\1]$", "u"))
				.throws("Invalid decimal escape")
				.type.errors(writeUnnecessaryEscapeMessage("1"))
			// @ts-expect-error
			attest(() => regex("^[^\\a]$", "v"))
				.throws("Invalid escape")
				.type.errors(writeUnnecessaryEscapeMessage("a"))
			// @ts-expect-error
			attest(() => regex("^[^\\p]$", "u"))
				.throws("Invalid property name")
				.type.errors(writeInvalidUnicodePropertyMessage("p"))
			// @ts-expect-error
			attest(() => regex("^[^\\p{}]$", "u"))
				.throws("Invalid property name")
				.type.errors(writeInvalidUnicodePropertyMessage("p"))
			// @ts-expect-error
			attest(() => regex("^[\\p]$", "u"))
				.throws("Invalid property name")
				.type.errors(writeInvalidUnicodePropertyMessage("p"))
			attest<Regex<string, { flags: "u" }>>(regex("^[^\\p{ASCII}]$", "u"))
			attest<Regex<string, { flags: "u" }>>(regex("^[^\\d]$", "u"))
			attest<Regex<string, { flags: "u" }>>(regex("^[^\\-]$", "u"))
			attest<Regex<string, {}>>(regex("^[^\\a]$"))
		})

		it("case-insensitive character sets", () => {
			const Single = regex("^[a]$", "i")
			attest<Regex<"a" | "A", { flags: "i" }>>(Single)
			attest(Single.test("A")).equals(true)

			const Multi = regex("^[aB1-]$", "i")
			attest<Regex<"a" | "A" | "b" | "B" | "1" | "-", { flags: "i" }>>(Multi)

			const Range = regex("^[a-z]$", "i")
			attest<Regex<string, { flags: "i" }>>(Range)

			const Digits = regex("^[0-9]$", "i")
			attest<Regex<`${number}`, { flags: "i" }>>(Digits)

			const Mixed = regex("^[a0-9]$", "i")
			attest<Regex<"a" | "A" | `${number}`, { flags: "i" }>>(Mixed)
		})

		it("shorthand", () => {
			const S = regex("^a[\\d]$")
			attest<Regex<`a${number}`, {}>>(S).type.toString.snap(
				"Regex<`a${number}`, {}>"
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

		it("out of order range", () => {
			// @ts-expect-error
			attest(() => regex("^[z-a]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("z", "a"))
			// @ts-expect-error
			attest(() => regex("^[9-0]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("9", "0"))
			// @ts-expect-error
			attest(() => regex("^[a-Z]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("a", "Z"))
			// @ts-expect-error
			attest(() => regex("^[^z-a]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("z", "a"))
			// @ts-expect-error
			attest(() => regex("^[a--b]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("a", "-"))

			// valid boundary cases
			attest<Regex<string, {}>>(regex("^[Z-a]$"))
			attest<Regex<string, {}>>(regex("^[a-a]$"))
			attest<Regex<string, {}>>(regex("^[!--]$"))
			attest<Regex<string, {}>>(regex("^[a-\\d]$"))
		})

		it("ES2024 v flag nested character classes and set operations", () => {
			const Subtract = regex("^[[a-z]--[aeiou]]$", "v")
			attest<Regex<string, { flags: "v" }>>(Subtract)
			attest(Subtract.test("b")).equals(true)
			attest(Subtract.test("a")).equals(false)
			attest(Subtract.test("--[aeiou]]")).equals(false)

			const Wrapped = regex("^a[[a-z]--[aeiou]]b$", "v")
			attest<Regex<`a${string}b`, { flags: "v" }>>(Wrapped)
			attest(Wrapped.test("axb")).equals(true)

			const NegatedNested = regex("^[^[a-z]--[aeiou]]$", "v")
			attest<Regex<string, { flags: "v" }>>(NegatedNested)
			attest(NegatedNested.test("a")).equals(true)
			attest(NegatedNested.test("b")).equals(false)

			const Intersect = regex("^[[a-z]&&[aeiou]]+$", "v")
			attest<Regex<string, { flags: "v" }>>(Intersect)
			attest(Intersect.test("ea")).equals(true)

			const EscapedBracket = regex("^[\\[[a-z]\\]]$", "v")
			attest<Regex<string, { flags: "v" }>>(EscapedBracket)
			attest(EscapedBracket.test("[")).equals(true)
			attest(EscapedBracket.test("]")).equals(true)

			const SingleEscapedBracket = regex("^[\\[]$", "v")
			attest<Regex<"[", { flags: "v" }>>(SingleEscapedBracket)

			const FlatSubtract = regex("^[\\w--_]$", "v")
			attest<Regex<string, { flags: "v" }>>(FlatSubtract)
			attest(FlatSubtract.test("a")).equals(true)
			attest(FlatSubtract.test("_")).equals(false)

			const ReverseSubtract = regex("^[z--a]$", "v")
			attest<Regex<string, { flags: "v" }>>(ReverseSubtract)

			const FlatIntersect = regex("^[a&&b]$", "v")
			attest<Regex<string, { flags: "v" }>>(FlatIntersect)

			const EscapedAmp = regex("^[a\\&&b]$", "v")
			attest<Regex<"a" | "&" | "b", { flags: "v" }>>(EscapedAmp)

			// @ts-expect-error
			attest(() => regex("^[[a-z]", "v"))
				.throws("Unterminated character class")
				.type.errors(writeUnclosedGroupMessage("]"))

			// @ts-expect-error
			attest(() => regex("^[a-\\-b]$", "v"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("a", "-"))
		})

		it("character class escapes and range endpoint validation", () => {
			const BracedUnicodeRange = regex("^[\\u{61}-z]$", "u")
			attest<Regex<string, { flags: "u" }>>(BracedUnicodeRange)
			attest(BracedUnicodeRange.test("m")).equals(true)

			const BracedUnicodeRangeV = regex("^[\\u{61}-z]$", "v")
			attest<Regex<string, { flags: "v" }>>(BracedUnicodeRangeV)

			// without u/v, \u{61}-z treats '}' as range start after literal 'u{61'
			// @ts-expect-error
			attest(() => regex("^[\\u{61}-z]$"))
				.throws("Range out of order in character class")
				.type.errors(writeOutOfOrderRangeMessage("}", "z"))

			const HexRange = regex("^[\\x3b-A]$")
			attest<Regex<string, {}>>(HexRange)
			attest(HexRange.test(";")).equals(true)
			attest(HexRange.test("A")).equals(true)

			attest<Regex<string, {}>>(regex("^[\\u003b-A]$"))
			attest<Regex<string, {}>>(regex("^[\\cA-Z]$"))
			attest<Regex<string, {}>>(regex("^[\\01-a]$"))

			const ClassString = regex("^[\\q{a|bc}]$", "v")
			attest<Regex<string, { flags: "v" }>>(ClassString)
			attest(ClassString.test("bc")).equals(true)

			const EscapedClassString = regex("^[\\q{\\}}]$", "v")
			attest<Regex<string, { flags: "v" }>>(EscapedClassString)
			attest(EscapedClassString.test("}")).equals(true)

			const ReservedPunctuators = regex("^[\\&\\!\\=\\<\\>\\~]$", "v")
			attest<Regex<"&" | "!" | "=" | "<" | ">" | "~", { flags: "v" }>>(
				ReservedPunctuators
			)

			// @ts-expect-error
			attest(() => regex("^[\\&]$", "u"))
				.throws("Invalid escape")
				.type.errors(writeUnnecessaryEscapeMessage("&"))

			// @ts-expect-error
			attest(() => regex("^[\\q{a}]$", "u"))
				.throws("Invalid escape")
				.type.errors(writeUnnecessaryEscapeMessage("q"))

			// @ts-expect-error
			attest(() => regex("^[\\q]$", "v"))
				.throws("Invalid escape")
				.type.errors(invalidClassStringDisjunctionMessage)

			// @ts-expect-error
			attest(() => regex("^[\\d-a]$", "u"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)
			// @ts-expect-error
			attest(() => regex("^[a-\\d]$", "u"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)
			// @ts-expect-error
			attest(() => regex("^[\\d-a]$", "v"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)
			// @ts-expect-error
			attest(() => regex("^[a-\\d]$", "v"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)
			// @ts-expect-error
			attest(() => regex("^[\\p{ASCII}-a]$", "u"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)
			// @ts-expect-error
			attest(() => regex("^[\\q{a}-z]$", "v"))
				.throws("Invalid character class")
				.type.errors(invalidClassRangeMessage)

			attest<Regex<`${number}` | "-", { flags: "u" }>>(regex("^[\\d-]$", "u"))
			attest<Regex<"-" | `${number}`, { flags: "u" }>>(regex("^[-\\d]$", "u"))

			// @ts-expect-error
			attest(() => regex("^[\\01]$", "u"))
				.throws("Invalid decimal escape")
				.type.errors(invalidDecimalEscapeMessage)
			// @ts-expect-error
			attest(() => regex("^[\\01]$", "v"))
				.throws("Invalid decimal escape")
				.type.errors(invalidDecimalEscapeMessage)
			// @ts-expect-error
			attest(() => regex("^[^\\01]$", "u"))
				.throws("Invalid decimal escape")
				.type.errors(invalidDecimalEscapeMessage)

			attest<Regex<"\0", { flags: "u" }>>(regex("^[\\0]$", "u"))
			attest<Regex<"\0" | "a", { flags: "u" }>>(regex("^[\\0a]$", "u"))
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
			attest<Regex<`a${number}c`, {}>>(S).type.toString.snap(
				"Regex<`a${number}c`, {}>"
			)
		})

		it("\\s", () => {
			const S = regex("^a\\sc$")
			attest<Regex<`a${string}c`, {}>>(S).type.toString.snap(
				"Regex<`a${string}c`, {}>"
			)
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

		it("escaped braces", () => {
			const S = regex("^a\\{b\\}$")
			attest<Regex<"a{b}", {}>>(S)

			// `}` must be escaped to be matched literally with `u` or `v` flags
			const U = regex("^a\\{b\\}$", "u")
			attest<Regex<"a{b}", { flags: "u" }>>(U)
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

		it("unicode property escapes require u or v flag", () => {
			attest<Regex<string, { flags: "u" }>>(regex("^\\p{Emoji}$", "u"))
			attest<Regex<string, { flags: "v" }>>(regex("^\\P{ASCII}$", "v"))
			// @ts-expect-error
			attest(() => regex("^\\p{Emoji}$")).type.errors(
				writeUnicodePropertyRequiresFlagMessage("p")
			)
			// @ts-expect-error
			attest(() => regex("^\\P{Emoji}$")).type.errors(
				writeUnicodePropertyRequiresFlagMessage("P")
			)
			// @ts-expect-error
			attest(() => regex("^\\p$", "u"))
				.throws("Invalid property name")
				.type.errors(writeInvalidUnicodePropertyMessage("p"))
			// inside a charset without u/v, \p is literal "p"
			attest<Regex<"p" | "{" | "a" | "}", {}>>(regex("^[\\p{a}]$"))
			// quantified identity escape \p{digits} without u/v is not a unicode property escape
			// @ts-expect-error
			attest(() => regex("^\\p{2}$")).type.errors(
				writeUnnecessaryEscapeMessage("p")
			)
			// @ts-expect-error
			attest(() => regex("^\\p{2,}$")).type.errors(
				writeUnnecessaryEscapeMessage("p")
			)
			// @ts-expect-error
			attest(() => regex("^\\P{1,3}$")).type.errors(
				writeUnnecessaryEscapeMessage("P")
			)
			// non-integer range bodies are not valid quantifiers, so still flagged as needing u/v
			// @ts-expect-error
			attest(() => regex("^\\p{1.5,2}$")).type.errors(
				writeUnicodePropertyRequiresFlagMessage("p")
			)
			// @ts-expect-error
			attest(() => regex("^\\p{-1,2}$")).type.errors(
				writeUnicodePropertyRequiresFlagMessage("p")
			)
			// @ts-expect-error
			attest(() => regex("^\\p{1e2,3}$")).type.errors(
				writeUnicodePropertyRequiresFlagMessage("p")
			)
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
						captures: ["bcd", "c"] | [undefined, undefined]
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

		it("zero-quantified capture group captures only undefined", () => {
			const Exact = regex("^(a){0}$")
			attest<Regex<"", { captures: [undefined] }>>(Exact)
			attest(Exact.exec("")?.[1]).equals(undefined)

			const Range = regex("^(a){0,0}$")
			attest<Regex<"", { captures: [undefined] }>>(Range)

			const Named = regex("^(?<a>x){0}$")
			attest<Regex<"", { captures: [undefined]; names: { a: undefined } }>>(
				Named
			)
			attest(Named.exec("")?.groups.a).equals(undefined)

			const Nested = regex("^(a(b)){0}$")
			attest<Regex<"", { captures: [undefined, undefined] }>>(Nested)

			const WithBackref = regex("^(a){0}\\1$")
			attest<Regex<"", { captures: [undefined] }>>(WithBackref)
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

		it("named captures in multiple branches", () => {
			// https://github.com/arktypeio/arktype/issues/1530
			const S = regex("^(?:(?<a>1)|(?<b>2)|(?<c>3))$")
			attest<
				Regex<
					"1" | "2" | "3",
					{
						captures:
							| ["1", undefined, undefined]
							| [undefined, "2", undefined]
							| [undefined, undefined, "3"]
						names:
							| { a: "1"; b: undefined; c: undefined }
							| { a: undefined; b: "2"; c: undefined }
							| { a: undefined; b: undefined; c: "3" }
					}
				>
			>(S)
		})

		it("capture following captures in multiple branches", () => {
			const S = regex("^(?:(a)|(b)(c))(d)$")
			attest<
				Regex<
					"ad" | "bcd",
					{
						captures:
							| ["a", undefined, undefined, "d"]
							| [undefined, "b", "c", "d"]
					}
				>
			>(S).type.toString.snap(`Regex<
	"ad" | "bcd",
	{
		captures:
			| [undefined, "b", "c", "d"]
			| ["a", undefined, undefined, "d"]
	}
>`)
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
		// ideally this could be collapsed to a single {string} but seems
		// inefficient for perf based on current implementation
		attest<Regex<`a${string}${string}c`, {}>>(S).type.toString.snap(
			"Regex<`a${string}${string}c`, {}>"
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
			>(S).type.toString.snap('Regex<"aa" | "bb", { captures: ["a"] | ["b"] }>')
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
			>(S)
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
			>(S)
		})

		it("reference to group in previous branch", () => {
			const S = regex("^(?:(a)|(b)\\1)$")
			attest<
				Regex<
					"a" | "b",
					{
						captures: ["a", undefined] | [undefined, "b"]
					}
				>
			>(S).type.toString.snap(`Regex<
	"a" | "b",
	{ captures: [undefined, "b"] | ["a", undefined] }
>`)
		})

		it("reference within later branch", () => {
			const S = regex("^(?:(a)|(b)\\2)$")
			attest<
				Regex<
					"a" | "bb",
					{
						captures: ["a", undefined] | [undefined, "b"]
					}
				>
			>(S).type.toString.snap(`Regex<
	"a" | "bb",
	{ captures: [undefined, "b"] | ["a", undefined] }
>`)
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
			>(S)
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
					"aa" | "bb",
					{
						captures: ["a"] | ["b"]
						names:
							| {
									foo: "b"
							  }
							| {
									foo: "a"
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

		it("invalid capture group name", () => {
			// @ts-expect-error
			attest(() => regex("^(?<1a>x)$"))
				.throws("Invalid capture group name")
				.type.errors(writeInvalidCaptureGroupNameMessage("1a"))
			// @ts-expect-error
			attest(() => regex("^(?<a-b>x)$"))
				.throws("Invalid capture group name")
				.type.errors(writeInvalidCaptureGroupNameMessage("a-b"))
			// @ts-expect-error
			attest(() => regex("^(?<a b>x)$"))
				.throws("Invalid capture group name")
				.type.errors(writeInvalidCaptureGroupNameMessage("a b"))
			// @ts-expect-error
			attest(() => regex("(?<a\\b>1)"))
				.throws("Invalid capture group name")
				.type.errors(writeInvalidCaptureGroupNameMessage("a\\\\b"))
			// @ts-expect-error
			attest(() => regex("(?<\\b>1)"))
				.throws("Invalid capture group name")
				.type.errors(writeInvalidCaptureGroupNameMessage("\\\\b"))
			// @ts-expect-error
			attest(() => regex("(?<a\\u12>1)"))
				.throws("Invalid Unicode escape")
				.type.errors(writeInvalidCaptureGroupNameMessage("a\\\\u12"))
			// @ts-expect-error
			attest(() => regex("(?<a\\u{}>1)"))
				.throws("Invalid Unicode escape")
				.type.errors(writeInvalidCaptureGroupNameMessage("a\\\\u{}"))

			attest<Regex<"x", { captures: ["x"]; names: { $a_1: "x" } }>>(
				regex("^(?<$a_1>x)$")
			)
			attest<Regex<"x", { captures: ["x"]; names: { é: "x" } }>>(
				regex("^(?<é>x)$")
			)
			attest<Regex<"1", { captures: ["1"]; names: { "a\\u0062": "1" } }>>(
				regex("^(?<a\\u0062>1)$")
			)
			attest<Regex<"1", { captures: ["1"]; names: { "a\\u{62}": "1" } }>>(
				regex("^(?<a\\u{62}>1)$")
			)
			attest<Regex<"1", { captures: ["1"]; names: { "\\u{61}1": "1" } }>>(
				regex("^(?<\\u{61}1>1)$")
			)
		})

		it("case-insensitive backreferences", () => {
			const Indexed = regex("^(x)\\1$", "i")
			attest<
				Regex<
					"xx" | "xX" | "Xx" | "XX",
					{ captures: ["x"] | ["X"]; flags: "i" }
				>
			>(Indexed)
			attest(Indexed.test("xX")).equals(true)

			const Named = regex("^(?<a>x)\\k<a>$", "i")
			attest<
				Regex<
					"xx" | "xX" | "Xx" | "XX",
					{
						captures: ["x"] | ["X"]
						names: { a: "x" } | { a: "X" }
						flags: "i"
					}
				>
			>(Named)
			attest(Named.test("Xx")).equals(true)

			const Bounded = regex("^(abcdef)\\1$", "i")
			const okBounded: typeof Bounded.infer = "abcdefABCDEF"
			attest(Bounded.test(okBounded)).equals(true)
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

		it("reference to named group in previous branch", () => {
			const Unanchored = regex("(?<x>a)|b\\k<x>")
			attest<
				Regex<
					`${string}a${string}` | `${string}b${string}`,
					{
						captures: ["a"] | [undefined]
						names: { x: "a" } | { x: undefined }
					}
				>
			>(Unanchored)
			attest(Unanchored.test("b")).equals(true)

			const Grouped = regex("^(?:(?<x>a)|b\\k<x>)$")
			attest<
				Regex<
					"a" | "b",
					{
						captures: ["a"] | [undefined]
						names: { x: "a" } | { x: undefined }
					}
				>
			>(Grouped)
			attest(Grouped.test("b")).equals(true)

			const MultiBranch = regex("^(?:(?<x>a)|(?<y>b)|c\\k<x>\\k<y>)$")
			attest<
				Regex<
					"a" | "b" | "c",
					{
						captures:
							| ["a", undefined]
							| [undefined, "b"]
							| [undefined, undefined]
						names:
							| { x: "a"; y: undefined }
							| { x: undefined; y: "b" }
							| { x: undefined; y: undefined }
					}
				>
			>(MultiBranch)

			const Shadowed = regex("^(?:(?<x>a)|(?<x>b)\\k<x>)$")
			attest<
				Regex<
					"a" | "bb",
					{
						captures: ["a", undefined] | [undefined, "b"]
						names: { x: "a" } | { x: "b" }
					}
				>
			>(Shadowed)
			attest(Shadowed.test("bb")).equals(true)

			const NestedShadowed = regex("^(?:(?<x>a)|(?:(?<x>b)|c)\\k<x>)$")
			attest<
				Regex<
					"a" | "bb" | "c",
					{
						captures:
							| ["a", undefined]
							| [undefined, "b"]
							| [undefined, undefined]
						names: { x: "a" } | { x: "b" } | { x: undefined }
					}
				>
			>(NestedShadowed)
			attest(NestedShadowed.test("bb")).equals(true)
			attest(NestedShadowed.test("c")).equals(true)

			// @ts-expect-error
			attest(() => regex("^(?:b\\k<x>|(?<x>a))$")).type.errors(
				writeUnresolvableBackreferenceMessage("x")
			)
		})

		it("duplicate capture group names", () => {
			// @ts-expect-error
			attest(() => regex("^(?<x>a)(?<x>b)$"))
				.throws("Duplicate capture group name")
				.type.errors(writeDuplicateCaptureGroupNameError("x"))
			// @ts-expect-error
			attest(() => regex("^(?<x>(?<x>a))$"))
				.throws("Duplicate capture group name")
				.type.errors(writeDuplicateCaptureGroupNameError("x"))
			// @ts-expect-error
			attest(() => regex("^(?:(?<x>a)|b)(?<x>c)$"))
				.throws("Duplicate capture group name")
				.type.errors(writeDuplicateCaptureGroupNameError("x"))
			// @ts-expect-error
			attest(() => regex("^(?<x>a)(?<x>b)|c$"))
				.throws("Duplicate capture group name")
				.type.errors(writeDuplicateCaptureGroupNameError("x"))

			// duplicate names in distinct alternation branches are valid JS
			const Alt = regex("^(?<x>a)|(?<x>b)$")
			attest<
				Regex<
					`a${string}` | `${string}b`,
					{
						captures: ["a", undefined] | [undefined, "b"]
						names: { x: "a" } | { x: "b" }
					}
				>
			>(Alt)
			const GroupedAlt = regex("^((?<x>a)|(?<x>b))$")
			attest<
				Regex<
					"a" | "b",
					{
						captures: ["a", "a", undefined] | ["b", undefined, "b"]
						names: { x: "a" } | { x: "b" }
					}
				>
			>(GroupedAlt)
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

		// https://github.com/arktypeio/arktype/issues/1532
		it("captures in a lookahead are counted", () => {
			const S = regex("^(?=(a))a(b)$")
			attest<Regex<"ab", { captures: ["a", "b"] }>>(S)
		})

		it("captures in a negative lookaround are undefined", () => {
			const S = regex("^(?<!(?<x>c))a(b)$")
			attest<
				Regex<"ab", { captures: [undefined, "b"]; names: { x: undefined } }>
			>(S)
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

		// https://github.com/arktypeio/arktype/issues/1533
		it("i with several branches", () => {
			const S = regex("^(?:relay|relai|point)$", "i")
			type anyCase<s extends string> =
				s extends `${infer head}${infer tail}` ?
					`${Lowercase<head> | Uppercase<head>}${anyCase<tail>}`
				:	""
			attest<Regex<anyCase<"relay" | "relai" | "point">, { flags: "i" }>>(S)
		})

		// https://github.com/arktypeio/arktype/issues/1533
		it("long case-insensitive patterns widen without TS2589", () => {
			const Instagram = regex(
				"^(?:https?://)?(?:www\\.)?instagram\\.com/([a-zA-Z0-9._]+)",
				"i"
			)
			const url1: typeof Instagram.infer = "https://www.instagram.com/arktype"
			const url2: typeof Instagram.infer = "HTTP://INSTAGRAM.COM/Ark_Type.1"
			const url3: typeof Instagram.infer = "instagram.com/user"
			const url4: typeof Instagram.infer = "WWW.Instagram.Com/foo"
			attest(Instagram.test(url1)).equals(true)
			attest(Instagram.test(url2)).equals(true)
			attest(Instagram.test(url3)).equals(true)
			attest(Instagram.test(url4)).equals(true)
			const match = Instagram.exec("HTTPS://WWW.INSTAGRAM.COM/ark_type")!
			attest<string>(match[1]).equals("ark_type")

			const Long = regex("^abcdefghijklmnopqrst$", "i")
			const okLower: typeof Long.infer = "abcdefghijklmnopqrst"
			const okUpper: typeof Long.infer = "ABCDEFGHIJKLMNOPQRST"
			const okMixed: typeof Long.infer = "AbCdEfGhIjKlMnOpQrSt"
			// @ts-expect-error first 5 characters are still checked case-insensitively
			const _badPrefix: typeof Long.infer = "xyzdefghijklmnopqrst"
			attest(Long.test(okLower)).equals(true)
			attest(Long.test(okUpper)).equals(true)
			attest(Long.test(okMixed)).equals(true)

			const Hyphenated = regex("^ab-cd-ef-gh-ij-kl-mn-op-qr-st$", "i")
			const okHyphen: typeof Hyphenated.infer = "Ab-cD-Ef-gH-Ij-kL-Mn-oP-Qr-sT"
			attest(Hyphenated.test(okHyphen)).equals(true)

			const Grouped = regex("^(?:abcde)(?:fghij)(?:klmno)(?:pqrst)$", "i")
			const okGrouped: typeof Grouped.infer = "ABCDEfghijKLMNOpqrst"
			attest(Grouped.test(okGrouped)).equals(true)

			const Repeated = regex("^a{20}$", "i")
			const okRepeated: typeof Repeated.infer = "aAaAaAaAaAaAaAaAaAaA"
			attest(Repeated.test(okRepeated)).equals(true)

			const RepeatedGroup = regex("^(?:abcde){10}$", "i")
			const okRepeatedGroup: typeof RepeatedGroup.infer =
				"abcdeABCDEabcdeABCDEabcdeABCDEabcdeABCDEabcdeABCDE"
			attest(RepeatedGroup.test(okRepeatedGroup)).equals(true)

			const Short = regex("^abc$", "i")
			attest<
				Regex<
					"abc" | "abC" | "aBc" | "aBC" | "Abc" | "AbC" | "ABc" | "ABC",
					{ flags: "i" }
				>
			>(Short)

			const MixedBranchThenSeq = regex("^(?:abcde|1)(?:fghij)$", "i")
			const okBranch1: typeof MixedBranchThenSeq.infer = "AbCdEfGhIj"
			const okBranch2: typeof MixedBranchThenSeq.infer = "1FGHIJ"
			attest(MixedBranchThenSeq.test(okBranch1)).equals(true)
			attest(MixedBranchThenSeq.test(okBranch2)).equals(true)
		})

		it("m", () => {
			const S = regex("^abc$", "m")
			attest<Regex<`${string}abc${string}`, { flags: "m" }>>(S)
		})

		it("m allows anchors mid-pattern", () => {
			const S = regex("a$\n^b", "m")
			attest<Regex<`${string}a\nb${string}`, { flags: "m" }>>(S)
		})

		it("non-canonical flag order is accepted and normalized", () => {
			const S = regex("^a$", "ig")
			attest<Regex<"a" | "A", { flags: "gi" }>>(S)
			attest(S.flags).equals("gi")

			const Multi = regex("^a$", "ymgids")
			attest<Regex<`${string}${"a" | "A"}${string}`, { flags: "dgimsy" }>>(
				Multi
			)
			attest(Multi.flags).equals("dgimsy")
		})

		it("rejects duplicate, invalid, and mutually exclusive flags", () => {
			// @ts-expect-error
			attest(() => regex("^a$", "ii"))
				.throws("Invalid flags")
				.type.errors(writeDuplicateFlagMessage("i"))
			// @ts-expect-error
			attest(() => regex("^a$", "uv"))
				.throws("Invalid flags")
				.type.errors(mutuallyExclusiveUnicodeFlagsMessage)
			// @ts-expect-error
			attest(() => regex("^a$", "z"))
				.throws("Invalid flags")
				.type.errors(writeInvalidFlagMessage("z"))
		})
	})

	describe("modifiers", () => {
		const nodeMajor = parseInt(process.versions.node.split(".")[0], 10)
		// modifier support was added in node 24
		if (nodeMajor >= 24) {
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
				attest(() => regex("(?-:abc)")).type.errors(
					missingNegatedModifierMessage
				)
			})

			it("empty negated modifier list when positive flags precede dash", () => {
				const S = regex("^(?i-:aB)$")
				attest<Regex<"aB" | "ab" | "Ab" | "AB", {}>>(S)
				attest(S.test("ab")).equals(true)

				// @ts-expect-error
				attest(() => regex("^(?i--:aB)$"))
					.throws("Multiple dashes")
					.type.errors(multipleModifierDashesMessage)
			})

			it("case-insensitive charset and backreference modifiers", () => {
				const CharsetOn = regex("^(?i:[ab])$")
				attest<Regex<"a" | "A" | "b" | "B", {}>>(CharsetOn)
				attest(CharsetOn.test("A")).equals(true)

				const CharsetOff = regex("^(?-i:[ab])$", "i")
				attest<Regex<"a" | "b", { flags: "i" }>>(CharsetOff)
				attest(CharsetOff.test("A")).equals(false)

				const RefOn = regex("^(a)(?i:\\1)$")
				attest<Regex<"aa" | "aA", { captures: ["a"] }>>(RefOn)
				attest(RefOn.test("aA")).equals(true)

				const RefOff = regex("^(a)(?-i:\\1)$", "i")
				attest<Regex<"aa" | "AA", { captures: ["a"] | ["A"]; flags: "i" }>>(
					RefOff
				)
				attest(RefOff.test("aA")).equals(false)
				attest(RefOff.test("AA")).equals(true)

				const RefTemplate = regex("^(.*a)(?i:\\1)$")
				attest<
					Regex<
						`${string}a${string}a` | `${string}a${string}A`,
						{ captures: [`${string}a`] }
					>
				>(RefTemplate)
				const okRefTemplate: typeof RefTemplate.infer = "xaXA"
				attest(RefTemplate.test(okRefTemplate)).equals(true)

				const RefLong = regex("^(abcdef)(?i:\\1)$")
				const okRefLong: typeof RefLong.infer = "abcdefABCDEF"
				attest(RefLong.test(okRefLong)).equals(true)
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

			it("m enable disables anchoring inside group", () => {
				const S = regex("^a(?m:$)")
				attest<Regex<`a${string}`, {}>>(S)
				attest(S.test("a\nb")).equals(true)
			})

			it("m disable restores anchoring inside group", () => {
				const S = regex("(?-m:^a$)", "m")
				attest<Regex<"a", { flags: "m" }>>(S)
				attest(S.test("a")).equals(true)
				attest(S.test("a\nb")).equals(false)
			})

			it("m enable allows mid-pattern anchor", () => {
				const S = regex("^a(?m:$)\nb$")
				attest<Regex<"a\nb", {}>>(S)
				attest(S.test("a\nb")).equals(true)
			})

			it("nested m enable/disable", () => {
				const S = regex("(?m:^a(?-m:$))")
				attest<Regex<`${string}a`, {}>>(S)
			})
		}
	})

	it("combinatorial", () => {
		const S = regex("^ab?c?d?e?f?g?h?i?j?k?l?m?n?o?$")
		type Expected =
			`a${"b" | ""}${"c" | ""}${"d" | ""}${"e" | ""}${"f" | ""}${"g" | ""}${"h" | ""}${"i" | ""}${"j" | ""}${"k" | ""}${"l" | ""}${"m" | ""}${"n" | ""}${"o" | ""}`
		attest<Regex<Expected, {}>>(S)
	})

	it("semver", () => {
		const S = regex("^(\\d+)\\.(\\d+)\\.(\\d+)$")

		attest<
			Regex<
				`${string}.${string}.${string}`,
				{
					captures: [string, string, string]
				}
			>
		>(S)
	})

	// these tests will break if `${bigint}` is used instead of `${number}`
	it("repeated digits allow 0 prefix", () => {
		const S = regex("^\\d\\d$")
		// we can't collapse this to a single `${number}` because of the performance cost
		// of treating the StartAnchorMarker as an empty string every time we appendNonRedundant
		attest<Regex<`${number}${number}`, {}>>(S)
		const value: typeof S.infer = "05"
	})

	it("quantified bigints allow 0 prefix", () => {
		const S = regex("^\\d{2}$")
		attest<Regex<`${number}`, {}>>(S)
		const value: typeof S.infer = "05"
	})

	it("many repeated digit", () => {
		const S = regex("^\\d{64}$")
		attest<Regex<`${number}`, {}>>(S)
		attest(S).type.toString.snap("Regex<`${number}`, {}>")
	})

	describe("regex.as", () => {
		it("0 type parameters", () => {
			const S = regex.as("^hello$")
			attest<Regex<string, {}>>(S)
			attest(S.source).equals("^hello$")
			attest(S.flags).equals("")
		})

		it("1 type parameter", () => {
			const S = regex.as<"hello">("^hello$")
			attest<Regex<"hello", {}>>(S)
		})

		it("2 type parameters", () => {
			const S = regex.as<"hello", { captures: ["hello"]; flags: "gi" }>(
				"^(hello)$",
				"gi"
			)
			attest<Regex<"hello", { captures: ["hello"]; flags: "gi" }>>(S)
		})
	})

	describe("exec", () => {
		it("indices of a capture that may not match may be undefined", () => {
			const S = regex("^(a)?(?<b>b)?(c)$", "d")
			const result = S.exec("c")!
			const { indices } = result
			attest<[start: number, end: number]>(indices[0])
			attest<[start: number, end: number] | undefined>(indices[1])
			attest<[start: number, end: number] | undefined>(indices.groups.b)
			attest<[start: number, end: number]>(indices[3])
			attest([indices[1], indices[2], indices.groups.b, indices[3]]).equals([
				undefined,
				undefined,
				undefined,
				[0, 1]
			])
		})

		it("indices of a capture absent from a branch are undefined", () => {
			const S = regex("^(?:(a)|(b))$", "d")
			const { indices } = S.exec("b")!
			attest<[start: number, end: number] | undefined>(indices[1])
			attest<[start: number, end: number] | undefined>(indices[2])
			attest([indices[1], indices[2]]).equals([undefined, [0, 1]])
		})
	})
})
