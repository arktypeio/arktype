import { Arr } from "../../../nodes/expression/array.js"
import type { Left } from "../state/left.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: parserState.requireRoot) => {
        const next = s.r.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.l.root = new Arr.Node(s.l.root)
        return s
    }

    export type Parse<
        S extends ParserState,
        Unscanned extends string
    > = Unscanned extends Scanner.Shift<"]", infer Remaining>
        ? ParserState.From<{
              L: Left.SetRoot<S["L"], [S["L"]["root"], "[]"]>
              R: Remaining
          }>
        : ParserState.Error<IncompleteTokenMessage>

    export const incompleteTokenMessage = `Missing expected ']'.`

    type IncompleteTokenMessage = typeof incompleteTokenMessage
}
