import {
    literalToNumber,
    NumberLiteralDefinition
} from "../../operand/index.js"
import {
    boundableNode,
    BoundableValue,
    boundChecker,
    boundValidationError,
    Comparator,
    createBoundChecker,
    link,
    Node,
    normalizedBound,
    Parser
} from "./common.js"

export type DoubleBoundComparator = keyof typeof doubleBoundTokens

export const doubleBoundTokens = Parser.tokenSet({
    "<": 1,
    "<=": 1
})

export type LowerBoundDefinition = [
    NumberLiteralDefinition,
    DoubleBoundComparator
]
export type UpperBoundDefinition = [
    DoubleBoundComparator,
    NumberLiteralDefinition
]

export type DoubleBoundNode = [
    NumberLiteralDefinition,
    Comparator,
    unknown,
    Comparator,
    NumberLiteralDefinition
]

export class doubleBoundNode extends link<boundableNode> {
    lower: normalizedBound
    upper: normalizedBound
    checkLower: boundChecker
    checkUpper: boundChecker

    constructor(
        child: boundableNode,
        private lowerDef: LowerBoundDefinition,
        private upperDef: UpperBoundDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        /** We have to invert the first comparator in an expression like
         * 5<=number<10
         * so that it can be split into two expressions like
         * number>=5
         * number<10
         */
        const invertedLeftToken = lowerDef[1] === "<" ? ">" : ">="
        this.lower = [invertedLeftToken, literalToNumber(this.lowerDef[0])]
        this.upper = [upperDef[0], literalToNumber(upperDef[1])]
        this.checkLower = createBoundChecker(this.lower)
        this.checkUpper = createBoundChecker(this.upper)
    }

    get tree() {
        return [
            this.lowerDef[0],
            this.lowerDef[1],
            this.child.tree,
            this.upperDef[0],
            this.upperDef[1]
        ]
    }

    allows(args: Node.Allows.Args) {
        if (!this.child.allows(args)) {
            return false
        }
        const actual = this.child.toBound(args.value)
        if (!this.checkLower(actual)) {
            const error: boundValidationError = {
                comparator: this.lower[0],
                limit: this.lower[1],
                actual,
                source: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        if (!this.checkUpper(actual)) {
            const error: boundValidationError = {
                comparator: this.upper[0],
                limit: this.upper[1],
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
