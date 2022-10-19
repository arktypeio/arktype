import type { ArktypeOptions } from "../../../type.js"
import type { Base } from "../../base/base.js"
import { Infix } from "./infix.js"

export class Scope extends Infix.Node {
    readonly kind = "scope"

    constructor(public child: Base.Node, public options: ArktypeOptions) {
        super()
    }

    traverse(traversal: Base.Traversal) {
        traversal.pushScope(this)
        this.child.traverse(traversal)
        traversal.popScope()
    }

    toString() {
        return this.child.toString()
    }

    tupleWrap(next: unknown) {
        return [next, "$", this.options] as const
    }

    get description() {
        return this.child.description
    }
}
