import type {
	Backslash,
	ErrorMessage,
	noSuggest,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { parseEscapedChar, StringDigit } from "./escape.ts"
import type { s, State, UnionTree } from "./state.ts"

export type parseCharset<s extends State, unscanned extends string> =
	Scanner.shiftUntilEscapable<unscanned, "]", Backslash> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			// we don't care about the contents of the negated char set because we can't infer it
			scanned extends Scanner.shift<"^", string> ?
				s.shiftQuantifiable<s, string, remaining>
			: parseNonNegatedCharset<scanned, []> extends infer branches ?
				branches extends string[] ?
					branches extends [] ?
						s.error<emptyCharacterSetMessage>
					:	s.shiftQuantifiable<
							s,
							branches["length"] extends 1 ? branches[0] : UnionTree<branches>,
							remaining
						>
				:	never
			:	never
		:	s.error<writeUnclosedGroupMessage<"]">>
	:	never

type parseNonNegatedCharset<chars extends string, set extends string[]> =
	parseChar<chars> extends Scanner.shiftResult<infer result, infer unscanned> ?
		result extends UnescapedDashMarker ? parseDash<unscanned, set>
		: result extends ErrorMessage ? result
		: parseNonNegatedCharset<unscanned, [...set, result]>
	:	set

type parseDash<unscanned extends string, set extends string[]> =
	set extends (
		[...infer chars extends string[], infer rangeStart extends string]
	) ?
		// the last element of the set will be the range start
		parseChar<unscanned> extends (
			Scanner.shiftResult<infer rangeEnd, infer next>
		) ?
			// the next unscanned character will be the range end
			next extends `-${infer postLiteralDash}` ?
				// literal - post range, e.g. "-" in [a-z-Z]
				// (both the second - and Z are treated as literal here)
				parseNonNegatedCharset<
					postLiteralDash,
					[...chars, inferRange<rangeStart, rangeEnd>, "-"]
				>
			:	parseNonNegatedCharset<
					next,
					[...chars, inferRange<rangeStart, rangeEnd>]
				>
		:	// trailing -, treat as literal
			[...set, "-"]
	:	// leading -, treat as literal
		parseNonNegatedCharset<unscanned, ["-"]>

// don't infer the full union of characters for ranges as it would blow up tsc
// immediately, but handle cases like 0-9 better than just `string`
type inferRange<start extends string, end extends string> =
	start | end extends StringDigit ? `${bigint}` : string

type UnescapedDashMarker = noSuggest<"dash">

type parseChar<unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends Backslash ?
			next extends Scanner.shift<infer escaped, infer postEscaped> ?
				Scanner.shiftResult<parseEscapedChar<escaped>, postEscaped>
			:	never
		:	Scanner.shiftResult<
				lookahead extends "-" ? UnescapedDashMarker : lookahead,
				next
			>
	:	// return null if called on an empty string
		null

export const emptyCharacterSetMessage =
	"Empty character set [] is unsatisfiable"

export type emptyCharacterSetMessage = typeof emptyCharacterSetMessage
