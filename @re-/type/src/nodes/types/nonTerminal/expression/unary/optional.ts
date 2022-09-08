import { StrNode } from "../../../../../parser/common.js"
import { Allows } from "../../../../traversal/allows.js"
import { Unary, unary } from "./unary.js"

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    get tree(): Optional<StrNode> {
        return [this.child.tree, "?"]
    }

    allows(args: Allows.Args) {
        if (args.data === undefined) {
            return true
        }
        return this.child.allows(args)
    }

    create() {
        return undefined
    }
}
