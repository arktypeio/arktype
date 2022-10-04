import { Optional } from "../../../nodes/expression/optional.js"
import { parserState } from "../state/state.js"
import type { ParserState } from "../state/state.js"

export namespace optionalOperator {}

export namespace OptionalOperator {
    export const finalize = (s: parserState.WithRoot) => {
        if (s.scanner.lookahead !== "END") {
            return parserState.error(nonTerminatingMessage)
        }
        parserState.finalize(s)
        s.root = new Optional.Node(s.root)
        return s
    }

    export type finalize<s extends ParserState.WithRoot> =
        s["unscanned"] extends "?"
            ? wrapWithOptionalIfValid<ParserState.finalize<s, 0>>
            : ParserState.error<nonTerminatingMessage>

    type wrapWithOptionalIfValid<s extends ParserState.Unvalidated> =
        s extends ParserState.Valid
            ? ParserState.setRoot<s, [s["root"], "?"]>
            : s

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`

    type nonTerminatingMessage = typeof nonTerminatingMessage
}
