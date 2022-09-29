import { OptionalNode } from "../../../../nodes/nonTerminal/postfix/optional.js"
import type { parserState, ParserState } from "../../state/state.js"

export const finalizeOptional = (s: parserState.withRoot) =>
    s.r.lookahead === "END"
        ? reduceOptional(s.finalize())
        : s.error(nonTerminatingOptionalMessage)

export type FinalizeOptional<S extends ParserState> = S["R"] extends "?"
    ? ParserState.Finalize<S, true>
    : ParserState.Error<NonTerminatingOptionalMessage>

export const reduceOptional = (s: parserState.withRoot) => {
    s.l.root = new OptionalNode(s.l.root)
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
