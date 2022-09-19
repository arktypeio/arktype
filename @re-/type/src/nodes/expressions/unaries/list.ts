import type { Allows } from "../../allows.js"
import type { boundableNode, bounds } from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/common.js"
import { checkObjectRoot } from "../../structures/index.js"
import type { Unary } from "./unary.js"
import { unary } from "./unary.js"

export type List<Child = unknown> = Unary<Child, "[]">

export class list extends unary implements boundableNode {
    bounds: bounds | undefined = undefined

    override toString() {
        const listToString = super.toString()
        return this.bounds
            ? this.bounds.boundString(listToString)
            : listToString
    }

    get tree() {
        const listNode = [this.child.tree, "[]"]
        return this.bounds ? this.bounds.boundTree(listNode) : listNode
    }

    check(args: Allows.Args) {
        if (!checkObjectRoot(args, "array")) {
            return
        }
        this.bounds?.check(args)
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
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return []
    }
}
