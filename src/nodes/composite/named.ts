import { throwInternalError } from "../../../dev/utils/src/main.js"
import {
    type CompilationContext,
    compilePropAccess,
    InputParameterName
} from "../../compile/compile.js"
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
    ctx: CompilationContext
) => props.map((prop) => compileNamedProp(prop, ctx)).join("\n")

export const compileNamedProp = (
    prop: NamedPropRule,
    ctx: CompilationContext
) => {
    ctx.path.push(prop.key.name)
    const compiledValue = `${
        prop.value.alias
    }(${InputParameterName}${compilePropAccess(prop.key.name)})`
    ctx.path.pop()
    const result = prop.key.optional
        ? `if('${prop.key.name}' in ${InputParameterName}) {
            ${compiledValue}
        }`
        : compiledValue
    return result
}

export type PropValueInput = TypeNode | TypeInput

export type NamedPropInput = Readonly<{
    value: PropValueInput
    optional?: boolean
    prerequisite?: boolean
}>

export type NamedPropRule = Readonly<{
    key: NamedKeyRule
    value: TypeNode
}>

export type NamedKeyRule = Readonly<{
    name: string
    optional: boolean
    prerequisite: boolean
}>
