import { compilePropAccess, In } from "../../compile/compile.js"
import { throwInternalError } from "../../../dev/utils/errors.js"
import { Disjoint } from "../disjoint.js"
import type { TypeInput, TypeNode } from "./type.js"
import { builtins } from "./type.js"

export const intersectNamedProp = (
    l: NamedPropRule,
    r: NamedPropRule
): NamedPropRule | Disjoint => {
    if (l.key.name !== r.key.name) {
        return throwInternalError(
            `Unexpected attempt to intersect non-equal keys '${l.key.name}' and '${r.key.name}'`
        )
    }
    const key: NamedKeyRule = {
        name: l.key.name,
        prerequisite: l.key.prerequisite || r.key.prerequisite,
        optional: l.key.optional && r.key.optional
    }
    const value = l.value.intersect(r.value)
    if (value instanceof Disjoint) {
        if (key.optional) {
            return {
                key,
                value: builtins.never()
            }
        }
        return value
    }
    return {
        key,
        value
    }
}

export const compileNamedProp = (prop: NamedPropRule) => {
    const valueCheck = prop.value.condition.replaceAll(
        In,
        `${In}${compilePropAccess(prop.key.name)}`
    )
    return prop.key.optional
        ? `!('${prop.key.name}' in ${In}) || ${valueCheck}`
        : valueCheck
}

export type NamedPropInput = {
    value: TypeInput
    optional?: boolean
    prerequisite?: boolean
}

export type NamedPropRule = {
    key: NamedKeyRule
    value: TypeNode
}

export type NamedKeyRule = {
    name: string
    optional: boolean
    prerequisite: boolean
}
