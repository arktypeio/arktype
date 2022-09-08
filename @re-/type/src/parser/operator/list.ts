import { Base } from "../../nodes/base.js"
import { Allows } from "../../nodes/traversal/allows.js"
import { Left, left } from "../parser/left.js"
import { Scanner } from "../parser/scanner.js"
import { ParserState, parserState } from "../parser/state.js"
import { boundableNode } from "./bound/exports.js"
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

export type List<Child = unknown> = Unary<Child, "[]">

export class list extends unary implements boundableNode {
    bound() {}

    get tree(): List<StrNode> {
        return [this.child.tree, "[]"]
    }

    allows(args: Allows.Args) {
        if (!Array.isArray(args.data)) {
            new Allows.UnassignableDiagnostic(this.toString(), args)
            return false
        }
        let allItemsAllowed = true
        let itemIndex = 0
        for (const itemValue of args.data) {
            const itemIsAllowed = this.child.allows({
                ...args,
                data: itemValue,
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, itemIndex]
                }
            })
            if (!itemIsAllowed) {
                allItemsAllowed = false
            }
            itemIndex++
        }
        return allItemsAllowed
    }

    create() {
        return []
    }

    readonly units = "items"

    checkSize(value: unknown[]) {
        return value.length
    }
}
