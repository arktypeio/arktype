import { compilePropAccess, In } from "../../compile/compile.js"
import { throwInternalError } from "../../utils/errors.js"
import { Disjoint } from "../disjoint.js"
import type { CompilationNode } from "../node.js"
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

// const valueCheck = prop.value.condition.replaceAll(
//     In,
//     `${In}${compilePropAccess(prop.key.name)}`
// )

export const compileNamedProp = (prop: NamedPropRule): CompilationNode => {
    return prop.key.optional
        ? {
              prefix: `if('${prop.key.name}' in ${In}) {`,
              key: prop.key.name,
              children: [prop.value.compilation],
              suffix: `}`
          }
        : {
              key: prop.key.name,
              children: [prop.value.compilation]
          }
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
