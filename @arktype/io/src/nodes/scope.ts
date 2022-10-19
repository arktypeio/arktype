import type { ArktypeOptions } from "../type.js"
import { Base } from "./base/base.js"

export class Scope extends Base.Node {
    readonly kind = "scope"
    definitionRequiresStructure: boolean

    constructor(public child: Base.Node, public options: ArktypeOptions) {
        super()
        this.definitionRequiresStructure = child.definitionRequiresStructure
    }

    traverse(traversal: Base.Traversal) {
        traversal.pushScope(this)
        this.child.traverse(traversal)
        traversal.popScope()
    }

    toString() {
        return this.child.toString()
    }

    get ast() {
        return this.child.ast
    }

    get definition() {
        return this.child.definition
    }

    get description() {
        return this.child.description
    }
}
