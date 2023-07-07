import { In } from "../../compiler/compile.js"
import { registry } from "../../compiler/registry.js"
import type { Narrow } from "../../parser/tuple.js"
import { NodeBase } from "../base.js"

export class NarrowNode extends NodeBase {
    readonly kind = "narrow"

    constructor(
        public readonly rule: Narrow,
        public readonly meta: {}
    ) {
        super()
    }

    compile() {
        return `${registry().register(this.rule)}(${In})`
    }

    describe() {
        return `valid according to ${this.rule.name}`
    }
}

// intersect: (l, r) =>
//     // as long as the narrows in l and r are individually safe to check
//     // in the order they're specified, checking them in the order
//     // resulting from this intersection should also be safe.
//     intersectUniqueLists(l.children, r.children)

// TODO: allow changed order to be the same type
