import { isEmpty } from "../../../utils/deepEquals.js"
import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { keyOrKeySet, keySet } from "../../../utils/generics.js"
import type { RegexLiteral } from "../../operand/enclosed.js"
import { operateDivisor } from "../../operator/divisor.js"
import type { Attribute, AttributeKey } from "./attributes.js"
import type { SerializedPrimitive } from "./value.js"

type AtomicOperator = "&" | "-"

export type DisjoinableAttributeKey = "type" | "value" | "bounds"

type OperatableKey = Exclude<AttributeKey, "branches">

export type OperateAttribute<t> = <operator extends AtomicOperator>(
    a: t,
    b: t,
    operator: operator
) => t | null

const operateKeyOrKeyset: OperateAttribute<keyOrKeySet<string>> = (
    a,
    b,
    operator
) => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            if (operator === "&") {
                return a === b ? a : { [a]: true, [b]: true }
            }
            return a === b ? null : a
        }
        if (operator === "&") {
            b[a] = true
            return b
        }
        return a in b ? null : a
    }
    if (typeof b === "string") {
        if (operator === "&") {
            a[b] = true
            return a
        }
        delete a[b]
        return isEmpty(a) ? null : a
    }
    return operateKeyset(a, b, operator)
}

const operateKeyset: OperateAttribute<keySet<string>> = (a, b, operation) => {
    if (operation === "&") {
        return Object.assign(a, b)
    }
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}

const operateDisjoint: OperateAttribute<string> = (a, b, operation) =>
    operation === "&" ? (a === b ? a : null) : a === b ? null : a

type AttributeOperations = {
    [k in OperatableKey]?: OperateAttribute<Attribute<k>>
}

export const operateAttribute: AttributeOperations = {
    type: operateDisjoint as OperateAttribute<DynamicTypeName>,
    value: operateDisjoint as OperateAttribute<SerializedPrimitive>,
    divisor: operateDivisor,
    alias: operateKeyOrKeyset,
    contradiction: operateKeyOrKeyset,
    regex: operateKeyOrKeyset as OperateAttribute<keyOrKeySet<RegexLiteral>>
}
