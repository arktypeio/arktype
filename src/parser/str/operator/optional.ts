import { ParserState } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: ParserState.WithRoot) => {
        if (s.scanner.lookahead !== "") {
            return ParserState.error(nonTerminatingMessage)
        }
        ParserState.finalize(s)
        s.root.optional = true
        return s
    }

    export type finalize<s extends ParserState.T.WithRoot> =
        s["unscanned"] extends "?"
            ? wrapWithOptionalIfValid<ParserState.finalize<s, 0>>
            : ParserState.error<nonTerminatingMessage>

    type wrapWithOptionalIfValid<s extends ParserState.T.Base> =
        s extends ParserState.T.Unfinished
            ? ParserState.setRoot<s, [s["root"], "?"]>
            : s

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`

    type nonTerminatingMessage = typeof nonTerminatingMessage
}
