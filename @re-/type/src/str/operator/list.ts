import { BoundableNode } from "./bound/index.js"
import { Node, Parser, Utils } from "./common.js"

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
    ? Parser.State.From<{ L: ReduceList<S["L"]>; R: Remaining }>
    : Parser.State.Error<IncompleteTokenMessage>

const incompleteTokenMessage = `Missing expected ']'.`

type IncompleteTokenMessage = typeof incompleteTokenMessage

type ReduceList<L extends Parser.Left> = Parser.Left.SetRoot<
    L,
    [L["root"], "[]"]
>

export type List<Child = unknown> = [Child, "[]"]

export class list extends Node.NonTerminal implements BoundableNode {
    toString() {
        return this.children.toString() + "[]"
    }

    allows(args: Node.Allows.Args) {
        if (!Array.isArray(args.value)) {
            this.addUnassignable(args)
            return false
        }
        let allItemsAllowed = true
        let itemIndex = 0
        for (const itemValue of args.value) {
            const itemIsAllowed = this.children.allows({
                ...args,
                value: itemValue,
                ctx: {
                    ...args.ctx,
                    path: Utils.pathAdd(args.ctx.path, itemIndex)
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

    boundBy = "items"

    toBound(value: unknown[]) {
        return value.length
    }
}
