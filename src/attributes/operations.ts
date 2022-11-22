import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import { satisfies } from "../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    AttributeOperations,
    Type
} from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { bounds } from "./bounds.js"
import { branchOperations } from "./branches.js"
import { divisor } from "./divisor.js"
import { keySetOperations } from "./keySets.js"
import { propsOperations, requiredOperations } from "./props.js"

const throwUnexpandedAliasError = () =>
    throwInternalError("Unexpected attempt to operate on unexpanded alias")

export const alias = defineOperations<Attribute<"alias">>()({
    intersection: throwUnexpandedAliasError,
    difference: throwUnexpandedAliasError
})

export const operations = satisfies<{
    [k in AttributeKey]: AttributeOperations<Attribute<k>>
}>()({
    bounds,
    divisor,
    alias,
    required: requiredOperations,
    regex: keySetOperations,
    contradiction: keySetOperations,
    props: propsOperations,
    branches: branchOperations
})

type DynamicOperation = (a: any, b: any, scope: ScopeRoot) => any

export const intersection = (a: Type, b: Type, scope: ScopeRoot): Type => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result = { ...a, ...b }
    delete result.branches
    let k: AttributeKey
    for (k in result) {
        if (k in a && k in b) {
            const fn = operations[k].intersection as DynamicOperation
            const intersection = fn(a[k], b[k], scope)
            if (intersection === null) {
                // TODO: Delegate based on k
                result.contradiction = {
                    [`${JSON.stringify(a[k])} and ${JSON.stringify(
                        b[k]
                    )} have no overlap`]: true
                }
            } else {
                result[k] = intersection
            }
        }
    }
    // TODO: Figure out prop never propagation
    return result
}

const expandIfAlias = (a: Type, scope: ScopeRoot) =>
    a.alias ? scope.resolve(a.alias) : a

export const difference = (a: Type, b: Type, scope: ScopeRoot) => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].difference as DynamicOperation
            result[k] = fn(a[k], b[k], scope)
            if (result[k] === null) {
                delete result[k]
            }
        } else {
            result[k] = a[k] as any
        }
    }
    return isEmpty(result) ? null : result
}

export const isSubtype = (a: Type, b: Type, scope: ScopeRoot) =>
    difference(b, a, scope) === null
