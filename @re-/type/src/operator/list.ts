import { base, Left, left, Node, Scanner, State, state } from "../core.js"
import { BoundableNode } from "./bound/index.js"

export const shiftReduce = (s: state<left.withRoot>, ctx: base.Context) => {
    const next = s.r.shift()
    if (next !== "]") {
        throw new Error(incompleteTokenMessage)
    }
    s.l.root = new base(s.l.root, ctx)
    return s
}

export type ShiftReduce<
    S extends State,
    Unscanned extends string
> = Unscanned extends Scanner.Shift<"]", infer Remaining>
    ? State.From<{ L: Reduce<S["L"]>; R: Remaining }>
    : State.Error<IncompleteTokenMessage>

const incompleteTokenMessage = `Missing expected ']'.`

type IncompleteTokenMessage = typeof incompleteTokenMessage

export type Reduce<L extends Left.Base> = Left.SetRoot<L, [L["root"], "[]"]>

export class node extends Node.NonTerminal implements BoundableNode {
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
                    path: Node.Utils.pathAdd(args.ctx.path, itemIndex)
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
