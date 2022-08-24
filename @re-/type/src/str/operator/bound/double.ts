import {
    BoundableNode,
    BoundableValue,
    BoundChecker,
    BoundValidationError,
    createBoundChecker,
    Node
} from "./common.js"
import { BoundableT, DoubleBoundComparator } from "./parse.js"

export type DoubleBoundLeft = [number, DoubleBoundComparator]
export type DoubleBoundRight = [DoubleBoundComparator, number]

export type DoubleBoundNode<
    Bounded extends BoundableT = BoundableT,
    LowerBound extends number = number,
    LowerComparator extends DoubleBoundComparator = DoubleBoundComparator,
    UpperComparator extends DoubleBoundComparator = DoubleBoundComparator,
    UpperBound extends number = number
> = [LowerBound, LowerComparator, Bounded, UpperComparator, UpperBound]

export class doubleBoundNode extends Node.NonTerminal<BoundableNode> {
    checkLower: BoundChecker
    checkUpper: BoundChecker

    constructor(
        child: BoundableNode,
        private left: DoubleBoundLeft,
        private right: DoubleBoundRight,
        ctx: Node.context
    ) {
        super(child, ctx)
        /** We have to invert the first comparator in an expression like
         * 5<=number<10
         * so that it can be split into two expressions like
         * number>=5
         * number<10
         */
        const invertedLeftToken = this.left[1] === "<" ? ">" : ">="
        this.checkLower = createBoundChecker(invertedLeftToken, this.left[0])
        this.checkUpper = createBoundChecker(this.right[0], this.right[1])
    }

    toString() {
        return (
            this.left[0] +
            this.left[1] +
            this.children.toString() +
            this.right[0] +
            this.right[1]
        )
    }

    allows(args: Node.Allows.Args) {
        if (!this.children.allows(args)) {
            return false
        }
        const evaluated = this.children.toBound(args.value)
        if (!this.checkLower(evaluated)) {
            const error: BoundValidationError = {
                // bounds: this.bounds,
                // cause: "left",
                evaluated,
                value: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        if (!this.checkUpper(evaluated)) {
            const error: BoundValidationError = {
                // bounds: this.bounds,
                // cause: "right",
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
