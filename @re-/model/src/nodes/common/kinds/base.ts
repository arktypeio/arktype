import {
    AllowsArgs,
    defaultNodeMethodContext,
    ErrorsByPath,
    GenerateArgs,
    ParseContext,
    stringifyDef,
    stringifyValue,
    ValidateOptions
} from "../common.js"

export abstract class Base<DefType> {
    constructor(public def: DefType, public ctx: ParseContext) {}

    protected stringifyDef() {
        return stringifyDef(this.def)
    }

    protected addUnassignable(args: AllowsArgs) {
        args.errors[args.ctx.valuePath] = `${stringifyValue(
            args.value
        )} is not assignable to ${this.stringifyDef()}.`
    }

    protected addCustomUnassignable(message: string, args: AllowsArgs) {
        args.errors[args.ctx.valuePath] = message
    }

    validateByPath(value: unknown, options: ValidateOptions = {}) {
        const errors: ErrorsByPath = {}
        this.allows({ value, errors, options, ctx: defaultNodeMethodContext })
        return errors
    }

    abstract allows(args: AllowsArgs): void
    abstract generate(args: GenerateArgs): unknown
}
