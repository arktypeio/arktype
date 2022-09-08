import { Base } from "../../nodes/base.js"
import { Bounds } from "../../nodes/constraints/bounds.js"
import { Allows } from "../../nodes/traversal/allows.js"
import { Left, left } from "../parser/left.js"
import { Scanner } from "../parser/scanner.js"
import { ParserState, parserState } from "../parser/state.js"
import { StrNode, Unary, unary } from "./common.js"

export const parseList = (s: parserState<left.withRoot>, ctx: Base.context) => {
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
