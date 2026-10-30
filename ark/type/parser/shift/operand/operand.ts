import type { BaseRoot, BaseScope } from "@ark/schema"
import { whitespaceChars, type Scanner, type WhitespaceChar } from "@ark/util"
import type { InferredAst } from "../../ast/infer.ts"
import type { RuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import type { BaseCompletions } from "../../string.ts"
import {
	enclosingChar,
	enclosingQuote,
	parseEnclosed,
	type EnclosingQuote,
	type EnclosingStartToken
} from "./enclosed.ts"
import { parseUnenclosed, writeMissingOperandMessage } from "./unenclosed.ts"

export const parseOperand = (s: RuntimeState): void =>
	s.sc.peek === "" ? s.error(writeMissingOperandMessage(s))
	: s.sc.peek === "(" ? s.shiftedBy(1).reduceGroupOpen()
	: s.sc.peekIsIn(enclosingChar) ? parseEnclosed(s, s.sc.shift())
	: s.sc.peekIsIn(whitespaceChars) ? parseOperand(s.shiftedBy(1))
	: s.sc.peek === "[" && s.sc.peekNext === "]" ?
		s.shiftedBy(2).setRoot(emptyTuple(s.ctx.$))
	: s.sc.peek === "d" ?
		s.sc.peekNext in enclosingQuote ?
			parseEnclosed(s, `${s.sc.shift()}${s.sc.shift()}` as EnclosingStartToken)
		:	parseUnenclosed(s)
	: s.sc.peek === "x" ?
		s.sc.peekNext === "/" ?
			s.shiftedBy(2) && parseEnclosed(s, "x/")
		:	parseUnenclosed(s)
	:	parseUnenclosed(s)

export type parseOperand<s extends StaticState, $, args> =
	s["unscanned"] extends Scanner.shift<infer peek, infer unscanned> ?
		peek extends "(" ? s.reduceGroupOpen<s, unscanned>
		: peek extends EnclosingStartToken ? parseEnclosed<s, peek, unscanned>
		: peek extends WhitespaceChar ?
			parseOperand<s.scanTo<s, unscanned>, $, args>
		: peek extends "[" ?
			unscanned extends Scanner.shift<"]", infer nextUnscanned> ?
				s.setRoot<s, InferredAst<[], "[]">, nextUnscanned>
			:	parseUnenclosed<s, $, args>
		: peek extends "d" ?
			unscanned extends (
				Scanner.shift<
					infer enclosing extends EnclosingQuote,
					infer nextUnscanned
				>
			) ?
				parseEnclosed<s, `d${enclosing}`, nextUnscanned>
			:	parseUnenclosed<s, $, args>
		: peek extends "x" ?
			unscanned extends Scanner.shift<"/", infer nextUnscanned> ?
				parseEnclosed<s, "x/", nextUnscanned>
			:	parseUnenclosed<s, $, args>
		:	parseUnenclosed<s, $, args>
	:	s.completion<`${s["scanned"]}${BaseCompletions<$, args>}`>

// the empty tuple, written [] as in TypeScript
const emptyTuple = ($: BaseScope): BaseRoot =>
	$.node("intersection", {
		proto: $.node("proto", { proto: Array }),
		exactLength: $.node("exactLength", { rule: 0 })
	})
