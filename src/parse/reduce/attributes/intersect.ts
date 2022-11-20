import type { DynamicScope } from "../../../scope.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import { hasKey } from "../../../utils/generics.js"
import { throwInternalError } from "../../errors.js"
import { expandAlias } from "./alias.js"
import type {
    Attribute,
    AttributeBranches,
    AttributeKey,
    Attributes
} from "./attributes.js"
import { intersectBounds } from "./bounds.js"
import { Contradiction } from "./contradiction.js"
import { intersectDivisors } from "./divisor.js"
import { intersectKeySets, intersectKeysOrSets } from "./keySets.js"
import { pruneBranches } from "./union/prune.js"

export const intersect = (
    a: Attributes,
    b: Attributes,
    scope: DynamicScope
) => {
    expandIntersectionAliases(a, b, scope)
    pruneBranches(b, a, scope)
    let k: AttributeKey
    for (k in b) {
        if (a[k] === undefined) {
            a[k] = b[k] as any
            intersectImplications(a, k, scope)
        } else {
            const result = dynamicallyIntersect(k, a[k], b[k], scope)
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

export const expandIntersectionAliases = (
    a: Attributes,
    b: Attributes,
    scope: DynamicScope
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

export type AttributeIntersector<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>,
    scope: DynamicScope
) => Attribute<k> | Contradiction

const intersectImplications = (
    a: Attributes,
    k: AttributeKey,
    scope: DynamicScope
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

const intersectProps: AttributeIntersector<"props"> = (a, b, scope) => {
    for (const k in b) {
        if (k in a) {
            a[k] = intersect(a[k], b[k], scope)
        } else {
            a[k] = b[k]
        }
    }
    return a
}

const intersectBranches = (
    a: AttributeBranches<false>,
    b: AttributeBranches<false>
): AttributeBranches<false> => {
    if (a[0] === "&") {
        if (b[0] === "&") {
            a[1].push(...b[1])
        } else {
            a[1].push(b)
        }
        return a
    }
    if (b[0] === "&") {
        b[1].push(a)
        return b
    }
    return ["&", [a, b]]
}

const intersectTypes: AttributeIntersector<"type"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`types ${a} and ${b} are mutually exclusive`)

const intersectValues: AttributeIntersector<"value"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`values ${a} and ${b} are mutually exclusive`)

type DynamicIntersector = AttributeIntersector<any>

const intersectors: {
    [k in AttributeKey]: AttributeIntersector<k>
} = {
    type: intersectTypes,
    value: intersectValues,
    alias: (a, b) =>
        throwInternalError(
            `Unexpected attempt to intersect aliases '${a}' and '${b}'`
        ),
    contradiction: intersectKeysOrSets,
    requiredKeys: intersectKeySets,
    regex: intersectKeysOrSets<RegexLiteral>,
    divisor: intersectDivisors,
    bounds: intersectBounds,
    props: intersectProps,
    branches: intersectBranches
}

const dynamicallyIntersect = (
    k: AttributeKey,
    a: unknown,
    b: unknown,
    scope: DynamicScope
) => (intersectors[k] as DynamicIntersector)(a, b, scope)
