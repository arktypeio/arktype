import type { Allows } from "../../allows.js"
import type { Unary, UnaryConstructorArgs } from "./unary.js"
import { unary } from "./unary.js"

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    constructor(...args: UnaryConstructorArgs) {
        super("?", ...args)
    }

    check(args: Allows.Args) {
        if (args.data === undefined) {
            return true
        }
        return this.child.check(args)
    }

    generate() {
        return undefined
    }
}
