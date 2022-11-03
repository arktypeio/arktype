import { isKeyOf, keysOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeKey,
    Attributes,
    AttributeSet,
    AttributeTypes,
    ContradictableKey,
    MaybeSetOf
} from "./shared.js"

// TODO: Remove
// eslint-disable-next-line max-lines-per-function
export const assignIntersection = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
) => {
    let k: AttributeKey
    for (k in alwaysIntersectedKeys) {
        if (k in base && !(k in assign)) {
            assign[k] = undefined
        }
    }
    for (k in assign) {
        if (k in base) {
            const intersection = dynamicReducers[k](base[k], assign[k], context)
            if (isEmptyIntersection(intersection)) {
                base.contradictions ??= {}
                intersectors.contradictions(
                    base.contradictions,
                    {
                        [k]: intersection
                    },
                    context
                )
            } else {
                base[k] = intersection
            }
        } else {
            base[k] = assign[k] as any
        }
        if (isKeyOf(k, implicationMap)) {
            assignIntersection(base, implicationMap[k](), context)
        }
    }
    return base
}

const intersectAdditiveAttribute = <t extends string>(
    base: MaybeSetOf<t>,
    assign: MaybeSetOf<t>
): MaybeSetOf<t> => {
    if (typeof base === "string") {
        if (typeof assign === "string") {
            return base === assign
                ? base
                : ({ [base]: true, [assign]: true } as AttributeSet<t>)
        }
        ;(assign as AttributeSet<t>)[base] = true
        return assign
    }
    if (typeof assign === "string") {
        ;(base as AttributeSet<t>)[assign] = true
        return base
    }
    return Object.assign(base, assign)
}

const intersectDisjointAttribute = <t extends string>(
    base: MaybeSetOf<t>,
    assign: MaybeSetOf<t>
): MaybeEmptyIntersection<MaybeSetOf<t>> => {
    if (typeof base === "string") {
        if (typeof assign === "string") {
            return base === assign ? base : [base, assign]
        }
        return base in assign ? base : [base, assign]
    }
    if (typeof assign === "string") {
        return assign in base ? assign : [base, assign]
    }
    const intersectionSet: AttributeSet<t> = {}
    for (const k in base) {
        if (assign[k]) {
            intersectionSet[k] = true
        }
    }
    const intersectingKeys = keysOf(intersectionSet)
    return intersectingKeys.length === 0
        ? [base, assign]
        : intersectingKeys.length === 1
        ? intersectingKeys[0]
        : intersectionSet
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
    // TODO: Figure out where this gets merged. Should require both if
    // finalized, but otherwise not.
    optional: (base, assign) => base && assign,
    aliases: intersectAdditiveAttribute,
    baseProp: (base, assign, context) =>
        assignIntersection(base, assign, context),
    props: (base, assign, context) => {
        const intersectedProps = { ...base, ...assign }
        for (const k in intersectedProps) {
            if (k in base && k in assign) {
                intersectedProps[k] = assignIntersection(
                    base[k],
                    assign[k],
                    context
                )
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
        let k: ContradictableKey
        for (k in assign) {
            base[k] ??= []
            base[k]!.push(assign[k] as any)
        }
        return base
    }
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (
        base: unknown,
        assign: unknown,
        context: DynamicParserContext
    ) => any
}

type KeyWithImplications = "divisor" | "regex" | "bounds"

type ImplicationsThunk = () => Attributes

const implicationMap: {
    [k in KeyWithImplications]: ImplicationsThunk
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

const alwaysIntersectedKeys = {
    optional: true
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
    value: AttributeTypes[k],
    context: DynamicParserContext
) =>
    | AttributeTypes[k]
    | (k extends ContradictableKey
          ? EmptyIntersectionResult<AttributeTypes[k]>
          : never)
