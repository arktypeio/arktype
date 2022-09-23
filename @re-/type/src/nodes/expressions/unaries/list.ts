import type { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import { checkObjectRoot } from "../../structs/struct.js"
import type { Unary, UnaryConstructorArgs } from "./unary.js"
import { unary } from "./unary.js"

export type List<Child = unknown> = Unary<Child, "[]">

export class list extends unary implements BoundableNode {
    bounds: BoundConstraint | undefined = undefined

    constructor(...args: UnaryConstructorArgs) {
        super("[]", ...args)
    }

    check(args: Allows.Args) {
        if (!checkObjectRoot(this.definition, "array", args)) {
            return
        }
        this.bounds?.check(args)
        let itemIndex = 0
        for (const itemValue of args.data) {
            this.child.check({
                ...args,
                data: itemValue,
                context: {
                    ...args.context,
                    path: [...args.context.path, itemIndex]
                }
            })
            itemIndex++
        }
    }

    generate() {
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return []
    }
}
