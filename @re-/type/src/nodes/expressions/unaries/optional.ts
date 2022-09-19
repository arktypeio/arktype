import type { Allows } from "../../allows.js"
import type { StrNode } from "../../common.js"
import type { Unary } from "./unary.js"
import { unary } from "./unary.js"

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    get tree(): Optional<StrNode> {
        return [this.child.tree, "?"]
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
