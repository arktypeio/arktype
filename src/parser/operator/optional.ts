import { assignIntersection } from "../../attributes/intersection.js"
import { State } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: State.DynamicWithRoot) => {
        if (s.scanner.lookahead !== "") {
            return State.error(nonTerminatingMessage)
        }
        State.finalize(s)
        s.root = assignIntersection(s.root, { optional: true }, s.context)
        return s
    }

    export type finalize<s extends State.StaticWithRoot> =
        s["unscanned"] extends "?"
            ? wrapWithOptionalIfValid<State.finalize<s, 0>>
            : State.error<nonTerminatingMessage>

    type wrapWithOptionalIfValid<s extends State.Unvalidated> = s extends {
        unscanned: string
    }
        ? State.setRoot<s, [s["root"], "?"]>
        : s

    export const nonTerminatingMessage = `Suffix '?' is only valid at the end of a definition.`

    type nonTerminatingMessage = typeof nonTerminatingMessage
}
