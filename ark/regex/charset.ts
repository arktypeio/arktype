import type {
	Backslash,
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { parseEscapedChar } from "./escape.ts"
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
							UnionTree<branches, { [i in keyof branches]: 1 }>,
							remaining
						>
				:	never
			:	never
		:	writeUnclosedGroupMessage<"]">
	:	never

type parseNonNegatedCharset<chars extends string, set extends string[]> =
	parseChar<chars> extends Scanner.shiftResult<infer result, infer unscanned> ?
		result extends UnescapedDashMarker ? parseDash<unscanned, set>
		: result extends ErrorMessage ? result
		: parseNonNegatedCharset<unscanned, [...set, result]>
	:	set

type parseDash<unscanned extends string, set extends string[]> =
	// leading -, treat as literal
	set extends [] ? parseNonNegatedCharset<unscanned, ["-"]>
	: parseChar<unscanned> extends Scanner.shiftResult<string, infer next> ?
		next extends `-${infer postLiteralDash}` ?
			parseNonNegatedCharset<postLiteralDash, [...set, string, "-"]>
		:	parseNonNegatedCharset<next, [...set, string]>
	:	// trailing -, treat as literal
		[...set, "-"]

type UnescapedDashMarker = "dash"

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
