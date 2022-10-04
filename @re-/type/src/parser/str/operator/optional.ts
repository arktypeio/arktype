import { Optional } from "../../../nodes/expression/optional.js"
import type { Left } from "../state/left.js"
import { left } from "../state/left.js"
import type { ParserState, parserState } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: parserState.requireRoot) => {
        if (s.r.lookahead !== "END") {
            return s.error(nonTerminatingMessage)
        }
        left.finalize(s)
        s.l.root = new Optional.Node(s.l.root)
        return s
    }

    export type Finalize<S extends ParserState.RequireRoot> = S["R"] extends "?"
        ? ParserState.From<{
              L: WrapWithOptionalIfValid<Left.Finalize<S["L"]>>
              R: ""
          }>
        : ParserState.Error<NonTerminatingMessage>

    type WrapWithOptionalIfValid<L extends Left> = L["final"] extends "ERR"
        ? L
        : Left.SetRoot<L, [L["root"], "?"]> & {
              final: "END"
          }

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`
    type NonTerminatingMessage = typeof nonTerminatingMessage
}
