import { throwInternalError } from "../../../dev/utils/src/errors.js"
import type { CompilationState } from "../../compile/state.js"
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

export const compileNamedProps = (
    props: NamedPropRule[],
    s: CompilationState
) => props.map((prop) => compileNamedProp(prop, s)).join("\n")

export const compileNamedProp = (prop: NamedPropRule, s: CompilationState) => {
    s.pushNamedKey(prop.key.name)
    const compiledValue = prop.value.compile(s)
    s.popKey()
    const result = prop.key.optional
        ? `if('${prop.key.name}' in ${s.data}) {
            ${compiledValue}
        }`
        : compiledValue
    return result
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
