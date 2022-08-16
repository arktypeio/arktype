import { Base } from "../../base/index.js"
import { NonTerminal } from "../nonTerminal.js"
import { Bound } from "./parse.js"
import {
    BoundableV,
    BoundableValue,
    BoundChecker,
    createBoundChecker
} from "./shared.js"

export type SingleBoundValidationError = {
    bound: SingleBoundDefinition
    value: BoundableValue
    evaluated: number
}

export type SingleBoundDefinition = [Bound.Token, number]

export class SingleBoundNode extends NonTerminal<BoundableV> {
    bound: SingleBoundDefinition
    check: BoundChecker

    constructor(
        child: BoundableV,
        bound: SingleBoundDefinition,
        ctx: Base.Parsing.Context
    ) {
        super(child, ctx)
        this.bound = [bound[0], bound[1]]
        this.check = createBoundChecker(this.bound[0], this.bound[1])
    }

    toString() {
        return this.children.toString() + this.bound[0] + this.bound[1]
    }

    allows(args: Base.Validation.Args) {
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

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Bound generation is unsupported."
        )
    }
}
