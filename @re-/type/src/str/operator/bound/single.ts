import {
    literalToNumber,
    NumberLiteralDefinition
} from "../../operand/index.js"
import {
    boundableNode,
    BoundableValue,
    boundChecker,
    boundValidationError,
    createBoundChecker,
    Node,
    normalizedBound,
    operator
} from "./common.js"
import { Comparator } from "./parse.js"

export type SingleBoundDefinition = [Comparator, NumberLiteralDefinition]

export type SingleBoundNode<
    Child = unknown,
    Token extends Comparator = Comparator,
    Value extends number = number
> = [Child, Token, Value]

export class singleBoundNode extends operator<boundableNode> {
    bound: normalizedBound
    checkBound: boundChecker

    constructor(
        child: boundableNode,
        private boundDef: SingleBoundDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        this.bound = [this.boundDef[0], literalToNumber(this.boundDef[1])]
        this.checkBound = createBoundChecker(this.bound)
    }

    get tree() {
        return [this.children.tree, this.boundDef[0], this.boundDef[1]]
    }

    allows(args: Node.Allows.Args) {
        // TODO update name of children to not be plural
        if (!this.children.allows(args)) {
            return false
        }
        const actual = this.children.toBound(args.value)
        if (!this.checkBound(actual)) {
            const error: boundValidationError = {
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
