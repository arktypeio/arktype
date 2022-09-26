import { OptionalNode } from "../../../../nodes/unaries/optional.js"
import type { ParseError, parserContext } from "../../../common.js"
import type { Left } from "../../state/left.js"
import type { parserState, ParserState } from "../../state/state.js"

export type FinalizeOptional<L extends Left, Unscanned> = Unscanned extends ""
    ? ParserState.From<{
          L: ReduceOptional<Left.Finalize<L>>
          R: "END"
      }>
    : ParserState.Error<NonTerminatingOptionalMessage>

export type ReduceOptional<L extends Left> =
    L["root"] extends ParseError<string> ? L : Left.SetRoot<L, [L["root"], "?"]>

export const parseOptional = (
    s: parserState.suffix,
    context: parserContext
) => {
    if (s.r.lookahead !== "END") {
        throw new Error(nonTerminatingOptionalMessage)
    }
    s.l.root = new OptionalNode(s.l.root, context)
    s.l.nextSuffix = "END"
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
