import { Optional } from "../../../nodes/expression/optional.js"
import { parserState } from "../state/state.js"
import type { ParserState } from "../state/state.js"

export namespace optionalOperator {
    export const finalize = (s: parserState.WithRoot) => {
        if (s.scanner.lookahead !== "END") {
            return parserState.error(nonTerminatingMessage)
        }
        parserState.finalize(s)
        s.root = new Optional.Node(s.root)
        return s
    }
}

export namespace OptionalOperator {
    export type finalize<S extends ParserState.WithRoot> =
        S["unscanned"] extends "?"
            ? wrapWithOptionalIfValid<ParserState.finalize<S, 0>>
            : ParserState.error<nonTerminatingMessage>

    type wrapWithOptionalIfValid<s extends ParserState.Unvalidated> =
        s extends ParserState.Valid
            ? ParserState.setRoot<s, [s["root"], "?"]>
            : s
}

export namespace optionalOperator {
    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`
}

export namespace OptionalOperator {
    export type nonTerminatingMessage =
        typeof optionalOperator.nonTerminatingMessage
}
