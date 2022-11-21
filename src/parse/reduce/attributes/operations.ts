import type { ScopeRoot } from "../../../scope.js"
import { isEmpty } from "../../../utils/deepEquals.js"
import type {
    mutable,
    RegexLiteral,
    requireKeys
} from "../../../utils/generics.js"
import { hasKey, satisfies } from "../../../utils/generics.js"
import type {
    Attribute,
    AttributeIntersection,
    AttributeKey,
    AttributeOperations,
    Attributes,
    MutableAttributes,
    SetOperation
} from "./attributes.js"
import { bounds } from "./bounds.js"
import { branches } from "./branches.js"
import { Contradiction } from "./contradiction.js"
import { divisor } from "./divisor.js"
import {
    defineKeyOrSetOperations,
    stringKeyOrSetOperations
} from "./keySets.js"
import { props, required } from "./props.js"
import { alias, type, value } from "./string.js"
import { pruneBranches } from "./union/prune.js"

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

type DynamicIntersection = AttributeIntersection<any>

type DynamicReadonlyOperation = SetOperation<any>

export const intersect = (
    a: Attributes,
    b: Attributes,
    scope: ScopeRoot
): Attributes => {
    let result = { ...a, ...b }
    pruneBranches(b, a, scope)
    let k: AttributeKey
    for (k in result) {
        if (k === "alias") {
            if (a.alias) {
                result = intersect(result, scope.resolve(a.alias), scope)
            }
            if (b.alias && b.alias !== a.alias) {
                result = intersect(result, scope.resolve(b.alias), scope)
            }
            delete result.alias
        } else if (k in a && k in b) {
            const fn = operations[k].intersect as DynamicIntersection
            const intersection = fn(a[k], b[k], scope)
            if (intersection instanceof Contradiction) {
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
    pruneBranches(a, b, scope)
    return result
}

export const extract = (a: Attributes, b: Attributes) => {
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].extract as DynamicReadonlyOperation
            result[k] = fn(a[k], b[k])
            if (result[k] === null) {
                delete result[k]
            }
        }
    }
    return isEmpty(result) ? null : result
}

export const exclude = (a: Attributes, b: Attributes) => {
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].exclude as DynamicReadonlyOperation
            result[k] = fn(a[k], b[k])
            if (result[k] === null) {
                delete result[k]
            }
        } else {
            result[k] = a[k] as any
        }
    }
    return isEmpty(result) ? null : result
}

export const isSubtype = (a: Attributes, possibleSuperType: Attributes) =>
    exclude(possibleSuperType, a) === null

const intersectImplications = (
    a: Attributes,
    k: AttributeKey,
    scope: ScopeRoot
) =>
    k === "bounds"
        ? intersect(
              a,
              {
                  branches: [
                      "|",
                      [
                          { type: "number" },
                          { type: "string" },
                          { type: "array" }
                      ]
                  ]
              },
              scope
          )
        : k === "divisor"
        ? intersect(a, { type: "number" }, scope)
        : a
