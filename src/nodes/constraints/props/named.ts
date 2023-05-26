import { Disjoint } from "../../disjoint.js"
import { BaseNode } from "../../node.js"
import type { TypeInput, TypeNode } from "../../type.js"
import { neverTypeNode } from "../../type.js"

export class NamedPropNode extends BaseNode<typeof NamedPropNode> {
    static readonly kind = "entry"

    static compile(entry: NamedPropRule) {
        return entry ? [] : []
    }

    computeIntersection(other: NamedPropNode) {
        const prerequisite = this.rule.prerequisite || other.rule.prerequisite
        const optional = this.rule.optional && other.rule.optional
        const value = this.rule.value.intersect(other.rule.value)
        if (value instanceof Disjoint) {
            if (optional) {
                return new NamedPropNode({
                    value: neverTypeNode,
                    optional,
                    prerequisite
                })
            }
            return value
        }
        return new NamedPropNode({
            value,
            optional,
            prerequisite
        })
    }

    toString() {
        return ""
    }

    // private static compileNamedEntry(entry: NamedNodeEntry) {
    //     const valueCheck = entry[1].value.condition.replaceAll(
    //         In,
    //         `${In}${compilePropAccess(entry[0])}`
    //     )
    //     return entry[1].precedence === "optional"
    //         ? `!('${entry[0]}' in ${In}) || ${valueCheck}`
    //         : valueCheck
    // }
}

export type NamedValueInput = {
    value: TypeInput
}

export type NamedPropRule = {
    value: TypeNode
    optional: boolean
    prerequisite: boolean
}
