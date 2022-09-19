import { list } from "../../../nodes/nonTerminal/expression/unary/list.js"
import type { parseContext } from "../../common.js"
import type { Left, left } from "../state/left.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export const parseList = (s: parserState<left.withRoot>, ctx: parseContext) => {
    const next = s.r.shift()
    if (next !== "]") {
        throw new Error(incompleteTokenMessage)
    }
    s.l.root = new list(s.l.root, ctx)
    return s
}

export type ParseList<
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
