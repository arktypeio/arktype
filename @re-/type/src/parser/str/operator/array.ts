import { Arr } from "../../../nodes/expression/array.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export namespace arrayOperator {
    export const parse = (s: parserState.WithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.root = new Arr.Node(s.root)
        return s
    }
}

export namespace ArrayOperator {
    export type Parse<
        s extends ParserState,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer Remaining>
        ? ParserState.setRoot<s, [s["root"], "[]"], Remaining>
        : ParserState.error<incompleteTokenMessage>
}

export namespace arrayOperator {
    export const incompleteTokenMessage = `Missing expected ']'.`
}

export namespace ArrayOperator {
    export type incompleteTokenMessage =
        typeof arrayOperator.incompleteTokenMessage
}
