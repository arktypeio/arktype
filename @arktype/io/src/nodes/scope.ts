import type { Dictionary } from "@arktype/tools"
import type { ArktypeOptions } from "../type.js"
import { Base } from "./base.js"
import type { TraversalState } from "./traversal/traversal.js"

export class Scope extends Base.Node {
    readonly kind = "scope"
    definitionRequiresStructure: boolean

    constructor(
        public child: Base.Node,
        public options: ArktypeOptions,
        public resolutions?: Dictionary<Base.Node>
    ) {
        super()
        this.definitionRequiresStructure = child.definitionRequiresStructure
    }

    allows() {
        return undefined
    }

    next(state: TraversalState) {
        state.scopes.push(this)
        this.child.traverse(state)
        state.scopes.pop()
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
