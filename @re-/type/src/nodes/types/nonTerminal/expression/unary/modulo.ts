import { StrNode } from "../../../../../parser/common.js"
import { Allows } from "../../../../traversal/allows.js"
import { Unary, unary } from "./unary.js"

export type Modulo<Child = unknown> = Unary<Child, "%">

export class modulo extends unary {
    get tree(): Modulo<StrNode> {
        return [this.child.tree, "%"]
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
