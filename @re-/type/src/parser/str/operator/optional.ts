import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"

export const finalizeOptional = (s: parserState.withPreconditionRoot) =>
    s.r.lookahead === "END"
        ? parserState.finalize(s, true)
        : s.error(nonTerminatingOptionalMessage)

export type FinalizeOptional<S extends ParserState.WithRootPrecondition> =
    S["R"] extends "?"
        ? ParserState.Finalize<S, true>
        : ParserState.Error<NonTerminatingOptionalMessage>

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
