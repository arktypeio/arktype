import { Attributes } from "../../../attributes/attributes.js"
import { ParserState } from "../state/state.js"

export namespace OptionalOperator {
    export const finalize = (s: ParserState.WithRoot) => {
        if (s.scanner.lookahead !== "") {
            return ParserState.error(nonTerminatingMessage)
        }
        ParserState.finalize(s)
        Attributes.add(s.root, "optional")
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
export const hasRootAttribute = <
    s extends ParserState.Base,
    k extends Attributes.Key,
    v extends Attributes[k]
>(
    s: s,
    k: k,
    v: v
): s is s & { root: { [_ in k]: v } } =>
    s.root !== null && k in s.root && s.root[k] === v
