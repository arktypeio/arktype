import {
    boundableNode,
    BoundableValue,
    BoundChecker,
    BoundValidationError,
    createBoundChecker,
    Node
} from "./common.js"
import { Comparator } from "./parse.js"

export type SingleBoundNode = [Comparator, number]

export class singleBoundNode extends Node.NonTerminal<boundableNode> {
    bound: SingleBoundNode
    checkBound: BoundChecker

    constructor(
        child: boundableNode,
        bound: SingleBoundNode,
        ctx: Node.context
    ) {
        super(child, ctx)
        this.bound = [bound[0], bound[1]]
        this.checkBound = createBoundChecker(this.bound[0], this.bound[1])
    }

    toString() {
        return this.children.toString() + this.bound[0] + this.bound[1]
    }

    allows(args: Node.Allows.Args) {
        // TODO update name of children to not be plural
        if (!this.children.allows(args)) {
            return false
        }
        const actual = this.children.toBound(args.value)
        if (!this.checkBound(actual)) {
            const error: BoundValidationError = {
                comparator: this.bound[0],
                limit: this.bound[1],
                actual,
                source: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        return true
    }

    create() {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "Bound generation is unsupported."
        )
    }
}
