/* eslint-disable max-lines-per-function */
import { toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import { NumberLiteralDefinition } from "../../index.js"
import { NonTerminal } from "../nonTerminal.js"
import { Bound, Boundable } from "./bound.js"

export type ValidSingleBoundDefinition = [Bound.Token, NumberLiteralDefinition]

export class SingleBoundNode extends NonTerminal<Boundable> {
    token: Bound.Token
    value: number
    description: string
    validator: (actual: number, args: Base.Validation.Args) => boolean

    constructor(
        child: Boundable,
        bound: ValidSingleBoundDefinition,
        ctx: Base.Parsing.Context
    ) {
        super(child, ctx)
        this.token = bound[0]
        this.value = toNumber(bound[1])
        this.description = `${this.value}${
            child.boundBy ? " " + child.boundBy : ""
        }`
        this.validator = this.createBoundValidator()
    }

    createBoundValidator() {
        switch (this.token) {
            // TODO: Create another helper to build these functions
            case "<=":
                return (actual: number, args: Base.Validation.Args) =>
                    actual > this.value
                        ? this.addBoundError(
                              "less than or equal to",
                              actual,
                              args
                          )
                        : true
            case ">=":
                return (actual: number, args: Base.Validation.Args) =>
                    actual < this.value
                        ? this.addBoundError(
                              "greater than or equal to",
                              actual,
                              args
                          )
                        : true
            case "<":
                return (actual: number, args: Base.Validation.Args) =>
                    actual >= this.value
                        ? this.addBoundError("less than", actual, args)
                        : true
            case ">":
                return (actual: number, args: Base.Validation.Args) =>
                    actual <= this.value
                        ? this.addBoundError("greater than", actual, args)
                        : true
            case "==":
                return (actual: number, args: Base.Validation.Args) =>
                    actual !== this.value
                        ? // Error message is cleaner without this.token name for equality check
                          this.addBoundError("", actual, args)
                        : true
            default:
                throw new Error(`Unexpected bound token ${this.token}.`)
        }
    }

    createValidatorForBound() {}

    toString() {
        return this.children.toString() + this.token + this.value
    }

    allows(args: Base.Validation.Args) {
        // TODO update name of children to not be plural
        if (!this.children.allows(args)) {
            return false
        }
        return this.validator(this.children.toBound(args.value), args)
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Bounded generation is unsupported."
        )
    }

    addBoundError(
        comparatorName: string,
        boundedValue: number,
        args: Base.Validation.Args
    ) {
        args.errors.add(
            args.ctx.path,
            `Must be ${comparatorName} ${this.description} (got ${boundedValue}).`
        )
        return false
    }
}
