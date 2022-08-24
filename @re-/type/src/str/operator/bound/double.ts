import {
    BoundableNode,
    BoundableValue,
    BoundChecker,
    createBoundChecker,
    Node
} from "./common.js"
import { DoubleBoundComparator } from "./parse.js"

export type DoubleBoundValidationError = {
    bounds: DoubleBoundDefinition
    cause: keyof DoubleBoundDefinition
    value: BoundableValue
    evaluated: number
}

export type DoubleBoundDefinition = {
    left: [number, DoubleBoundComparator]
    right: [DoubleBoundComparator, number]
}

export class DoubleBoundNode extends Node.NonTerminal<BoundableNode> {
    checkLower: BoundChecker
    checkUpper: BoundChecker

    constructor(
        child: BoundableNode,
        private bounds: DoubleBoundDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        /** We have to invert the first comparator in an expression like
         * 5<=number<10
         * so that it can be split into two expressions like
         * number>=5
         * number<10
         */
        const invertedLeftToken = this.bounds.left[1] === "<" ? ">" : ">="
        this.checkLower = createBoundChecker(
            invertedLeftToken,
            this.bounds.left[0]
        )
        this.checkUpper = createBoundChecker(
            this.bounds.right[0],
            this.bounds.right[1]
        )
    }

    toString() {
        return (
            this.bounds.left[0] +
            this.bounds.left[1] +
            this.children.toString() +
            this.bounds.right[0] +
            this.bounds.right[1]
        )
    }

    allows(args: Node.Allows.Args) {
        if (!this.children.allows(args)) {
            return false
        }
        const evaluated = this.children.toBound(args.value)
        if (!this.checkLower(evaluated)) {
            const error: DoubleBoundValidationError = {
                bounds: this.bounds,
                cause: "left",
                evaluated,
                value: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        if (!this.checkUpper(evaluated)) {
            const error: DoubleBoundValidationError = {
                bounds: this.bounds,
                cause: "right",
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
