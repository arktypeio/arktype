import { Base } from "../../base/index.js"
import { NonTerminal } from "../nonTerminal.js"
import { Bound } from "./parse.js"
import {
    BoundableNode,
    BoundableValue,
    BoundChecker,
    createBoundChecker
} from "./shared.js"

export type DoubleBoundValidationError = {
    bounds: DoubleBoundDefinition
    cause: keyof DoubleBoundDefinition
    value: BoundableValue
    evaluated: number
}

export type DoubleBoundDefinition = {
    lower: [number, Bound.DoubleBoundToken]
    upper: [Bound.DoubleBoundToken, number]
}

export class DoubleBoundNode extends NonTerminal<BoundableNode> {
    checkLower: BoundChecker
    checkUpper: BoundChecker

    constructor(
        child: BoundableNode,
        private bounds: DoubleBoundDefinition,
        ctx: Base.Parsing.Context
    ) {
        super(child, ctx)
        /** We have to invert the first comparator in an expression like
         * 5<=number<10
         * so that it can be split into two expressions like
         * number>=5
         * number<10
         */
        const invertedLeftToken = this.bounds.lower[1] === "<" ? ">" : ">="
        this.checkLower = createBoundChecker(
            invertedLeftToken,
            this.bounds.lower[0]
        )
        this.checkUpper = createBoundChecker(
            this.bounds.upper[0],
            this.bounds.upper[1]
        )
    }

    toString() {
        return (
            this.bounds.lower[0] +
            this.bounds.lower[1] +
            this.children.toString() +
            this.bounds.upper[0] +
            this.bounds.upper[1]
        )
    }

    allows(args: Base.Validation.Args) {
        if (!this.children.allows(args)) {
            return false
        }
        const evaluated = this.children.toBound(args.value)
        if (!this.checkLower(evaluated)) {
            const error: DoubleBoundValidationError = {
                bounds: this.bounds,
                cause: "lower",
                evaluated,
                value: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        if (!this.checkUpper(evaluated)) {
            const error: DoubleBoundValidationError = {
                bounds: this.bounds,
                cause: "upper",
                evaluated,
                value: args.value as BoundableValue
            }
            args.errors.add(args.ctx.path, error)
            return false
        }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Bound generation is unsupported."
        )
    }
}
