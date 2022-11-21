import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { RegexLiteral } from "../utils/generics.js"
import { satisfies } from "../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    AttributeOperations,
    Attributes,
    MutableAttributes,
    SetOperation
} from "./attributes.js"
import { bounds } from "./bounds.js"
import { branches } from "./branches.js"
import { divisor } from "./divisor.js"
import {
    defineKeyOrSetOperations,
    stringKeyOrSetOperations
} from "./keySets.js"
import { props, required } from "./props.js"
import { alias, type, value } from "./strings.js"

export const operations = satisfies<{
    [k in AttributeKey]: AttributeOperations<Attribute<k>>
}>()({
    value,
    type,
    bounds,
    divisor,
    alias,
    required,
    regex: defineKeyOrSetOperations<RegexLiteral>(),
    contradiction: stringKeyOrSetOperations,
    props,
    branches
})

type DynamicOperation = SetOperation<any>

export const intersect = (
    a: Attributes,
    b: Attributes,
    scope: ScopeRoot
): Attributes => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result = { ...a, ...b }
    delete result.branches
    let k: AttributeKey
    for (k in result) {
        if (k in a && k in b) {
            const fn = operations[k].intersect as DynamicOperation
            const intersection = fn(a[k], b[k], scope)
            if (intersection === null) {
                result.contradiction = result.contradiction
                    ? operations.contradiction.intersect(
                          result.contradiction,
                          intersection.message
                      )
                    : intersection.message
            } else {
                result[k] = intersection
            }
        }
    }
    // TODO: Figure out prop never propagation
    return result
}

const expandIfAlias = (a: Attributes, scope: ScopeRoot) =>
    a.alias ? scope.resolve(a.alias) : a

export const extract = (a: Attributes, b: Attributes, scope: ScopeRoot) => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].extract as DynamicOperation
            result[k] = fn(a[k], b[k], scope)
            if (result[k] === null) {
                delete result[k]
            }
        }
    }
    return isEmpty(result) ? null : result
}

export const exclude = (a: Attributes, b: Attributes, scope: ScopeRoot) => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].exclude as DynamicOperation
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

export const isSubtype = (a: Attributes, b: Attributes, scope: ScopeRoot) =>
    exclude(b, a, scope) === null
