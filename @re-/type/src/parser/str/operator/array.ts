import { Arr } from "../../../nodes/expression/array.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: parserState.WithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.root = new Arr.Node(s.root)
        return s
    }

    export type Parse<
        s extends ParserState,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer remaining>
        ? ParserState.setRoot<s, [s["root"], "[]"], remaining>
        : ParserState.error<incompleteTokenMessage>

    export const incompleteTokenMessage = `Missing expected ']'.`

    type incompleteTokenMessage = typeof incompleteTokenMessage
}
