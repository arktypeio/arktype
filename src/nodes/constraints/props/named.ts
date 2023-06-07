import { compilePropAccess, In } from "../../../compile/compilation.js"
import { throwInternalError } from "../../../utils/errors.js"
import { Disjoint } from "../../disjoint.js"
import type { TypeInput, TypeNode } from "../../type.js"
import { neverTypeNode } from "../../type.js"

export const compileNamedProps = (props: NamedPropRule[]) =>
    props.map(compileNamedProp).join(" && ") || "true"

const compileNamedProp = (prop: NamedPropRule) => {
    const valueCheck = prop.value.condition.replaceAll(
        In,
        `${In}${compilePropAccess(prop.key)}`
    )
    return prop.optional
        ? `!('${prop.key}' in ${In}) || ${valueCheck}`
        : valueCheck
}

export const intersectNamedProp = (
    l: NamedPropRule,
    r: NamedPropRule
): NamedPropRule | Disjoint => {
    if (l.key !== r.key) {
        return throwInternalError(
            `Unexpected attempt to intersect non-equal keys '${l.key}' and '${r.key}'`
        )
    }
    const key = l.key
    const prerequisite = l.prerequisite || r.prerequisite
    const optional = l.optional && r.optional
    const value = l.value.intersect(r.value)
    if (value instanceof Disjoint) {
        if (optional) {
            return {
                key,
                value: neverTypeNode,
                optional,
                prerequisite
            }
        }
        return value
    }
    return {
        key,
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
    key: string
    value: TypeNode
    optional: boolean
    prerequisite: boolean
}
