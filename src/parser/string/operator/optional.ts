import { Attributes } from "../../../attributes/attributes2.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: DynamicState.WithRoot) => {
        if (s.scanner.lookahead !== "") {
            return DynamicState.error(nonTerminatingMessage)
        }
        DynamicState.finalize(s)
        s.root = Attributes.reduce("optional", s.root, true)
        return s
    }

    export type finalize<s extends StaticState.WithRoot> =
        s["unscanned"] extends "?"
            ? wrapWithOptionalIfValid<StaticState.finalize<s, 0>>
            : StaticState.error<nonTerminatingMessage>

    type wrapWithOptionalIfValid<s extends StaticState.Unvalidated> =
        s extends {
            unscanned: string
        }
            ? StaticState.setRoot<s, [s["root"], "?"]>
            : s

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`

    type nonTerminatingMessage = typeof nonTerminatingMessage
}
