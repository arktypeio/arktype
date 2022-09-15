import { StrNode } from "../../../../../parser/common.js"
import { boundableNode, bounds } from "../../../../constraints/bounds.js"
import { Allows } from "../../../../traversal/allows.js"
import { Unary, unary } from "./unary.js"

export type List<Child = unknown> = Unary<Child, "[]">

export class list extends unary implements boundableNode {
    bounds: bounds | undefined = undefined

    get tree(): List<StrNode> {
        return [this.child.tree, "[]"]
    }

    check(args: Allows.Args) {
        if (!Array.isArray(args.data)) {
            new Allows.UnassignableDiagnostic(this.toString(), args)
            return false
        }
        let itemIndex = 0
        for (const itemValue of args.data) {
            this.child.check({
                ...args,
                data: itemValue,
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, itemIndex]
                }
            })
            itemIndex++
        }
    }

    create() {
        return []
    }
}
