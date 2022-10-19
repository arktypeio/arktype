import type { ArktypeOptions } from "../type.js"
import { Base } from "./base/base.js"
import type { TraversalState } from "./traversal/traversal.js"

export class Scope extends Base.Node {
    readonly kind = "scope"
    definitionRequiresStructure: boolean

    constructor(public child: Base.Node, public options: ArktypeOptions) {
        super()
        this.definitionRequiresStructure = child.definitionRequiresStructure
    }

    traverse(state: TraversalState) {
        state.pushScope(this)
        this.child.traverse(state)
        state.popScope()
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

    get mustBe() {
        return this.child.mustBe
    }
}
