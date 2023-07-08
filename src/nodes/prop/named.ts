import { throwInternalError } from "@arktype/utils"
import {
    type CompilationContext,
    compilePropAccess,
    In
} from "../../compiler/compile.js"
import { NodeBase } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { TypeInput } from "../parse.js"
import type { TypeNode } from "../type.js"
import { builtins } from "../union/utils.js"

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
    props: readonly NamedPropRule[],
    ctx: CompilationContext
) => props.map((prop) => compileNamedProp(prop, ctx)).join("\n")

export const compileNamedProp = (
    prop: NamedPropRule,
    ctx: CompilationContext
) => {
    ctx.path.push(prop.key.name)
    const compiledValue = `${prop.value.alias}(${In}${compilePropAccess(
        prop.key.name
    )})`
    ctx.path.pop()
    const result = prop.key.optional
        ? `if('${prop.key.name}' in ${In}) {
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

// export type NamedEntry = Readonly<{
//     key: string
//     value: TypeNode
//     optional?: true
//     prerequisite?: true
// }>

// export class NamedPropNode extends NodeBase<NamedEntry, {}> {
//     readonly kind = "named"
//     readonly key = this.rule.key
//     readonly value = this.rule.value
//     readonly optional = this.rule.optional
//     readonly prerequisite = this.rule.prerequisite

//     compile(ctx: CompilationContext) {
//         ctx.path.push(this.key)
//         const compiledValue = `${this.value.alias}(${In}${compilePropAccess(
//             this.key
//         )})`
//         ctx.path.pop()
//         const result = this.optional
//             ? `if('${this.key}' in ${In}) {
//                 ${compiledValue}
//             }`
//             : compiledValue
//         return result
//     }

//     describe() {
//         return `${this.rule.key}${this.rule.optional ? "?" : ""}: ${
//             this.rule.value
//         }`
//     }
// }
