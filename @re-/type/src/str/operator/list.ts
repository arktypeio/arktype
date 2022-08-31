import { boundableNode } from "./bound/exports.js"
import { Node, Parser, StrNode, Unary, unary } from "./common.js"

export const parseList = (
    s: Parser.state<Parser.left.withRoot>,
    ctx: Node.context
) => {
    const next = s.r.shift()
    if (next !== "]") {
        throw new Error(incompleteTokenMessage)
    }
    s.l.root = new list(s.l.root, ctx)
    return s
}

export type ParseList<
    S extends Parser.State,
    Unscanned extends string
> = Unscanned extends Parser.Scanner.Shift<"]", infer Remaining>
    ? Parser.State.From<{
          L: Parser.Left.SetRoot<S["L"], [S["L"]["root"], "[]"]>
          R: Remaining
      }>
    : Parser.State.Error<IncompleteTokenMessage>

export const incompleteTokenMessage = `Missing expected ']'.`

type IncompleteTokenMessage = typeof incompleteTokenMessage

export type List<Child = unknown> = Unary<Child, "[]">

export class list extends unary implements boundableNode {
    bound() {}

    get tree(): List<StrNode> {
        return [this.child.tree, "[]"]
    }

    allows(args: Node.Allows.Args) {
        if (!Array.isArray(args.value)) {
            this.addUnassignable(args)
            return false
        }
        let allItemsAllowed = true
        let itemIndex = 0
        for (const itemValue of args.value) {
            const itemIsAllowed = this.child.allows({
                ...args,
                value: itemValue,
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
