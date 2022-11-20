import type { ScopeRoot } from "../../../scope.js"
import { isEmpty } from "../../../utils/deepEquals.js"
import type { RegexLiteral, requireKeys } from "../../../utils/generics.js"
import { hasKey, satisfies } from "../../../utils/generics.js"
import type {
    Attribute,
    AttributeIntersection,
    AttributeKey,
    AttributeOperations,
    Attributes,
    ReadonlyAttributeOperation,
    ReadonlyAttributes
} from "./attributes.js"
import { bounds } from "./bounds.js"
import { branches } from "./branches.js"
import { Contradiction } from "./contradiction.js"
import { divisor } from "./divisor.js"
import {
    defineKeyOrSetOperations,
    keySetOperations,
    stringKeyOrSetOperations
} from "./keySets.js"
import { props } from "./props.js"
import { alias, type, value } from "./string.js"
import { pruneAttribute, pruneBranches } from "./union/prune.js"

export const operations = satisfies<{
    [k in AttributeKey]: AttributeOperations<Attribute<k>>
}>()({
    value,
    type,
    bounds,
    divisor,
    alias,
    requiredKeys: keySetOperations,
    regex: defineKeyOrSetOperations<RegexLiteral>(),
    contradiction: stringKeyOrSetOperations,
    props,
    branches
})

type DynamicIntersection = AttributeIntersection<any>

type DynamicReadonlyOperation = ReadonlyAttributeOperation<any>

export const intersect = (a: Attributes, b: Attributes, scope: ScopeRoot) => {
    expandIntersectionAliases(a, b, scope)
    // TODO: Figure out prop never propagation
    pruneBranches(a, b, scope)
    let k: AttributeKey
    for (k in b) {
        if (a[k] === undefined) {
            a[k] = b[k] as any
            intersectImplications(a, k, scope)
        } else {
            const fn = operations[k].intersect as DynamicIntersection
            const result = fn(a[k], b[k], scope)
            if (result instanceof Contradiction) {
                intersect(a, { contradiction: result.message }, scope)
            } else {
                a[k] = result
            }
        }
    }
    return a
}

export const extract = (a: ReadonlyAttributes, b: ReadonlyAttributes) => {
    const result: Attributes = {}
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

export const exclude = (a: ReadonlyAttributes, b: ReadonlyAttributes) => {
    const result: Attributes = {}
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

export const isSubtype = (
    a: ReadonlyAttributes,
    possibleSuperType: ReadonlyAttributes
) => exclude(a, possibleSuperType) === null

export const expandAlias = (
    attributes: requireKeys<Attributes, "alias">,
    scope: ScopeRoot
) => {
    const resolution = scope.resolve(pruneAttribute(attributes, "alias")!)
    intersect(attributes, resolution, scope)
}

const expandIntersectionAliases = (
    a: Attributes,
    b: Attributes,
    scope: ScopeRoot
) => {
    let prunedAlias: string | undefined
    if (hasKey(a, "alias")) {
        prunedAlias = a.alias
        expandAlias(a, scope)
    }
    if (hasKey(b, "alias") && b.alias !== prunedAlias) {
        expandAlias(b, scope)
    }
}

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
