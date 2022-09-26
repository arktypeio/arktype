import type { Check } from "../traverse/exports.js"
import type { UnaryConstructorArgs } from "./unary.js"
import { UnaryNode } from "./unary.js"

export class OptionalNode extends UnaryNode {
    constructor(...args: UnaryConstructorArgs) {
        super("?", ...args)
    }

    check(state: Check.CheckState) {
        if (state.data === undefined) {
            return
        }
        this.child.check(state)
    }

    generate() {
        return undefined
    }
}
