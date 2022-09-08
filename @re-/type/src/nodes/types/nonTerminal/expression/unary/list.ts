import { StrNode } from "../../../../../parser/common.js"
import { boundableNode } from "../../../../constraints/bounds.js"
import { Allows } from "../../../../traversal/allows.js"
import { Unary, unary } from "./unary.js"

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
