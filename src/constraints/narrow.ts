import { In } from "../compiler/compile.js"
import { registry } from "../compiler/registry.js"
import { NodeBase } from "../nodes/base.js"
import type { Narrow } from "../parser/tuple.js"

export type NarrowIntersection = readonly NarrowNode[]

export class NarrowNode extends NodeBase<{
    rule: Narrow
    intersection: NarrowIntersection
    meta: {}
}> {
    readonly kind = "narrow"

    compile() {
        return `${registry().register(this.rule)}(${In})`
    }

    intersect(other: NarrowIntersection) {
        const matching = other.find((node) => node.rule === this.rule)
        return matching ? other : [...other, this]
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
