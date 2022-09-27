import { OptionalNode } from "../../../../nodes/unaries/optional.js"
import type { parserContext } from "../../../common.js"
import type { parserState, ParserState } from "../../state/state.js"

export const finalizeOptional = (s: parserState.withRoot, ctx: parserContext) =>
    s.r.lookahead === "END"
        ? reduceOptional(s.finalize(), ctx)
        : s.error(nonTerminatingOptionalMessage)

export type FinalizeOptional<S extends ParserState> = S["R"] extends "?"
    ? ParserState.Finalize<S, true>
    : ParserState.Error<NonTerminatingOptionalMessage>

export const reduceOptional = (s: parserState.withRoot, ctx: parserContext) => {
    s.l.root = new OptionalNode(s.l.root, ctx)
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
