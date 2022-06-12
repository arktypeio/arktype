import {
    appendToPath,
    defaultNodeMethodContext,
    ErrorsByPath,
    ParseContext,
    stringifyDef,
    stringifyValue,
    ValidateOptions
} from "../common.js"
import { Common } from "../index.js"

export abstract class Base<DefType> {
    constructor(public def: DefType, public ctx: ParseContext) {}

    protected stringifyDef() {
        return stringifyDef(this.def)
    }

    protected appendToPath(segment: string | number) {
        return appendToPath(this.ctx.path, segment)
    }

    protected addUnassignable(value: unknown, errors: ErrorsByPath) {
        errors[this.ctx.path] = `${stringifyValue(
            value
        )} is not assignable to ${this.stringifyDef()}.`
    }

    protected addUnassignableMessage(message: string, errors: ErrorsByPath) {
        errors[this.ctx.path] = message
    }

    validateByPath(value: unknown, options: ValidateOptions = {}) {
        const errors: ErrorsByPath = {}
        this.allows({ value, errors, options, ctx: defaultNodeMethodContext })
        return errors
    }

    abstract allows(args: Common.AllowsArgs): void
    abstract generate(args: Common.GenerateArgs): unknown
}
