import type { ScopeRoot } from "../../../scope.js"
import { isEmpty } from "../../../utils/deepEquals.js"
import type { RegexLiteral, requireKeys } from "../../../utils/generics.js"

import { hasKey, satisfies } from "../../../utils/generics.js"
import type {
    Attribute,
    AttributeExclusion,
    AttributeIntersection,
    AttributeKey,
    AttributeOperations,
    Attributes
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

type DynamicExclusion = AttributeExclusion<any>

export const intersect = (a: Attributes, b: Attributes, scope: ScopeRoot) => {
    expandIntersectionAliases(a, b, scope)
    pruneBranches(b, a, scope)
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
    // TODO: Figure out prop never propagation
    pruneBranches(a, b, scope)
    return a
}

export const exclude = (a: Readonly<Attributes>, b: Readonly<Attributes>) => {
    const difference: Attributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].exclude as DynamicExclusion
            difference[k] = fn(a[k], b[k])
            if (difference[k] === null) {
                delete difference[k]
            }
        } else {
            difference[k] = a[k] as any
        }
    }
    return isEmpty(difference) ? null : difference
}

export const isSubtype = (
    a: Readonly<Attributes>,
    possibleSuperType: Readonly<Attributes>
) => exclude(a, possibleSuperType) === null

export const expandAlias = (
    attributes: requireKeys<Attributes, "alias">,
    scope: ScopeRoot
) =>
    intersect(
        attributes,
        scope.resolve(pruneAttribute(attributes, "alias")!),
        scope
    )

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
