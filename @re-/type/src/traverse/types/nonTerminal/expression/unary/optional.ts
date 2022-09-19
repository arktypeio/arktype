import { StrNode } from "../../../../../parse/common.js"
import { Allows } from "../../../../allows.js"
import { Unary, unary } from "./unary.js"

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
