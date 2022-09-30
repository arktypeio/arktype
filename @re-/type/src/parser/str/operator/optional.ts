import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: parserState.requireRoot) =>
        s.r.lookahead === "END"
            ? parserState.finalize(s, true)
            : s.error(nonTerminatingMessage)

    export type Finalize<S extends ParserState.RequireRoot> = S["R"] extends "?"
        ? ParserState.Finalize<S, true>
        : ParserState.Error<NonTerminatingMessage>

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`
    type NonTerminatingMessage = typeof nonTerminatingMessage
}
