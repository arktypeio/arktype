import type { Check } from "../../traverse/exports.js"
import type { Unary, UnaryConstructorArgs } from "./unary.js"
import { unary } from "./unary.js"

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    constructor(...args: UnaryConstructorArgs) {
        super("?", ...args)
    }

    check(args: Check.CheckArgs) {
        if (args.data === undefined) {
            return true
        }
        return this.child.check(args)
    }

    generate() {
        return undefined
    }
}
