import { Attributes } from "../../../attributes/attributes.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: ParserState.WithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.root = Attributes.initialize({ type: "array", values: s.root })
        return s
    }

    export type parse<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer remaining>
        ? ParserState.setRoot<s, [s["root"], "[]"], remaining>
        : ParserState.error<incompleteTokenMessage>

    export const incompleteTokenMessage = `Missing expected ']'.`

    type incompleteTokenMessage = typeof incompleteTokenMessage
}
