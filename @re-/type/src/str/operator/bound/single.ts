import { Node } from "../../../common.js"
import {
    BoundableNode,
    BoundableValue,
    BoundChecker,
    createBoundChecker
} from "./common.js"
import { Comparator } from "./parse.js"

export type SingleBoundValidationError = {
    bound: SingleBoundDefinition
    value: BoundableValue
    evaluated: number
}

export type SingleBoundDefinition = [Comparator, number]

export class SingleBoundNode extends Node.NonTerminal<BoundableNode> {
    bound: SingleBoundDefinition
    check: BoundChecker

    constructor(
        child: BoundableNode,
        bound: SingleBoundDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        this.bound = [bound[0], bound[1]]
        this.check = createBoundChecker(this.bound[0], this.bound[1])
    }

    toString() {
        return this.children.toString() + this.bound[0] + this.bound[1]
    }

    allows(args: Node.Allows.Args) {
        // TODO update name of children to not be plural
        if (!this.children.allows(args)) {
            return false
        }
        const evaluated = this.children.toBound(args.value)
        if (!this.check(evaluated)) {
            const error: SingleBoundValidationError = {
                bound: this.bound,
                evaluated,
                value: args.value as BoundableValue
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
