import {
    AllowsArgs,
    GenerateArgs,
    ParseContext,
    stringifyDef,
    stringifyValue
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

    protected addCustomUnassignable(args: AllowsArgs, message: string) {
        args.errors[args.ctx.valuePath] = message
    }

    abstract allows(args: AllowsArgs): void
    abstract generate(args: GenerateArgs): unknown
}
