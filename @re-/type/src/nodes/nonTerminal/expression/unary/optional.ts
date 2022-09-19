import type { StrNode } from "../../../../parser/common.js"
import type { Allows } from "../../../allows.js"
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

    create() {
        return undefined
    }
}
