import { compilePropAccess, In } from "../../compilation.js"
import { Disjoint } from "../../disjoint.js"
import type { TypeInput, TypeNode } from "../../type.js"
import { neverTypeNode } from "../../type.js"

export const compileNamedProp = (key: string, rule: NamedPropRule) => {
    const valueCheck = rule.value.condition.replaceAll(
        In,
        `${In}${compilePropAccess(key)}`
    )
    return rule.optional ? `!('${key}' in ${In}) || ${valueCheck}` : valueCheck
}

export const intersectNamedProp = (
    l: NamedPropRule,
    r: NamedPropRule
): NamedPropRule | Disjoint => {
    const prerequisite = l.prerequisite || r.prerequisite
    const optional = l.optional && r.optional
    const value = l.value.intersect(r.value)
    if (value instanceof Disjoint) {
        if (optional) {
            return {
                value: neverTypeNode,
                optional,
                prerequisite
            }
        }
        return value
    }
    return {
        value,
        optional,
        prerequisite
    }
}

export type NamedPropInput = {
    value: TypeInput
    optional?: boolean
    prerequisite?: boolean
}

export type NamedPropRule = {
    value: TypeNode
    optional: boolean
    prerequisite: boolean
}
