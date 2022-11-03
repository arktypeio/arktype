import { isKeyOf, keysOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeKey,
    Attributes,
    AttributeTypes,
    ContradictableKey,
    ContradictionKind,
    keyOrKeySet,
    keySet
} from "./shared.js"

export const add = <k extends AttributeKey>(
    base: Attributes,
    key: k,
    value: AttributeTypes[k]
) => intersect(base, { [key]: value })

export const intersection = (branches: Attributes[]) => {
    while (branches.length > 1) {
        branches.unshift(intersect(branches.pop()!, branches.pop()!))
    }
    return branches[0]
}

const intersect = (base: Attributes, assign: Attributes) => {
    let k: AttributeKey
    for (k in assign) {
        if (k in base) {
            const intersection = dynamicReducers[k](base[k], assign[k])
            if (isEmptyIntersection(intersection)) {
                base.contradictions ??= {}
                intersectors.contradictions(base.contradictions, {
                    [k]: intersection
                })
            } else {
                base[k] = intersection
            }
        } else {
            base[k] = assign[k] as any
        }
        if (isKeyOf(k, implicationMap)) {
            intersect(base, implicationMap[k]())
        }
    }
    return base
}

const intersectAdditiveAttribute = <t extends string>(
    base: keyOrKeySet<t>,
    assign: keyOrKeySet<t>
): keyOrKeySet<t> => {
    if (typeof base === "string") {
        if (typeof assign === "string") {
            return base === assign
                ? base
                : ({ [base]: true, [assign]: true } as keySet<t>)
        }
        ;(assign as keySet<t>)[base] = true
        return assign
    }
    if (typeof assign === "string") {
        ;(base as keySet<t>)[assign] = true
        return base
    }
    return Object.assign(base, assign)
}

const intersectDisjointAttribute = <k extends string>(
    base: keyOrKeySet<k>,
    assign: keyOrKeySet<k>
): MaybeEmptyIntersection<keyOrKeySet<k>> => {
    if (typeof base === "string") {
        if (typeof assign === "string") {
            return base === assign ? base : [base, assign]
        }
        return base in assign ? base : [base, assign]
    }
    if (typeof assign === "string") {
        return assign in base ? assign : [base, assign]
    }
    const intersectionSet = intersectKeySets(base, assign)
    const intersectingKeys = keysOf(intersectionSet)
    return intersectingKeys.length === 0
        ? [base, assign]
        : intersectingKeys.length === 1
        ? intersectingKeys[0]
        : intersectionSet
}

const intersectKeySets = <k extends string>(
    base: keySet<k>,
    assign: keySet<k>
) => {
    const intersectionSet: keySet<k> = {}
    for (const k in base) {
        if (assign[k]) {
            intersectionSet[k] = true
        }
    }
    return intersectionSet
}

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: intersectDisjointAttribute,
    type: intersectDisjointAttribute,
    divisor: (base, assign) => intersectDivisors(base, assign),
    regex: (base, assign) => intersectAdditiveAttribute(base, assign),
    bounds: intersectBounds,
    requiredKeys: (base, assign) => intersectKeySets(base, assign),
    aliases: intersectAdditiveAttribute,
    baseProp: (base, assign) => intersect(base, assign),
    props: (base, assign) => {
        const intersectedProps = { ...base, ...assign }
        for (const k in intersectedProps) {
            if (k in base && k in assign) {
                intersectedProps[k] = intersect(base[k], assign[k])
            }
        }
        return intersectedProps
    },
    branches: (base, assign) => {
        if (base[0] === "&") {
            if (assign[0] === "&") {
                for (let i = 1; i < assign.length; i++) {
                    base.push(assign[i])
                }
                return base
            }
            base.push(assign)
            return base
        }
        if (assign[0] === "&") {
            assign.push(base)
            return assign
        }
        return ["&", base, assign]
    },
    contradictions: (base, assign) => {
        let k: ContradictionKind
        for (k in assign) {
            if (k === "never") {
                base.never = true
            } else {
                base[k] ??= []
                base[k]!.push(assign[k] as any)
            }
        }
        return base
    }
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (base: unknown, assign: unknown) => any
}

type KeyWithImplications = "divisor" | "regex" | "bounds"

const implicationMap: {
    [k in KeyWithImplications]: () => Attributes
} = {
    divisor: () => ({ type: "number" }),
    bounds: () => ({
        type: {
            number: true,
            string: true,
            array: true
        }
    }),
    regex: () => ({ type: "string" })
}

export const isEmptyIntersection = (
    intersection: unknown
): intersection is EmptyIntersectionResult<unknown> =>
    Array.isArray(intersection)

type MaybeEmptyIntersection<t> = t | EmptyIntersectionResult<t>

export type EmptyIntersectionResult<t> = [
    baseConflicting: t,
    assignConflicting: t
]

export type Intersector<k extends AttributeKey> = (
    base: AttributeTypes[k],
    value: AttributeTypes[k]
) =>
    | AttributeTypes[k]
    | (k extends ContradictableKey
          ? EmptyIntersectionResult<AttributeTypes[k]>
          : never)
