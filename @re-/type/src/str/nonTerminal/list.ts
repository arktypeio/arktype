import { Core } from "../base.js"
import { Left, Scan, State } from "../parser/index.js"
import { BoundableNode } from "./bound/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export const shiftReduce = (s: State.WithRoot, ctx: Core.Parse.Context) => {
        const next = s.r.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.l.root = new ListNode(s.l.root, ctx)
        return s
    }

    export type ShiftReduce<
        S extends State.T,
        Unscanned extends string
    > = Unscanned extends Scan<"]", infer Remaining>
        ? State.From<{ L: List.Reduce<S["L"]>; R: Remaining }>
        : State.Error<IncompleteTokenMessage>

    const incompleteTokenMessage = `Missing expected ']'.`

    type IncompleteTokenMessage = typeof incompleteTokenMessage

    export type Reduce<L extends Left.T.Base> = Left.SetRoot<
        L,
        [L["root"], "[]"]
    >

    export type Node<Child> = [Child, "[]"]
}

export class ListNode extends NonTerminal implements BoundableNode {
    toString() {
        return this.children.toString() + "[]"
    }

    allows(args: Core.Validate.Args) {
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
                    path: Core.Utils.pathAdd(args.ctx.path, itemIndex)
                }
            })
            if (!itemIsAllowed) {
                allItemsAllowed = false
            }
            itemIndex++
        }
        return allItemsAllowed
    }

    generate() {
        return []
    }

    boundBy = "items"

    toBound(value: unknown[]) {
        return value.length
    }
}
