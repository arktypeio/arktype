import { isKeyOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeKey,
    Attributes,
    AttributeTypes,
    ContradictableKey
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
        // TODO: Value undefined?
        if (base[k] === assign[k]) {
            continue
        }
        if (k in base) {
            const intersection = dynamicReducers[k](base[k], assign[k], context)
            if (isEmpty(intersection)) {
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

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: (base, assign) => [base, assign],
    type: (base, assign) => [base, assign],
    divisor: (base, assign) => intersectDivisors(base, assign),
    regex: (base, assign) => `${base}${assign}`,
    bounds: intersectBounds,
    // TODO: Figure out where this gets merged. Should require both if
    // finalized, but otherwise not.
    optional: (base, assign) => base && assign,
    alias: (base, assign) => `${base}&${assign}`,
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
        const assignBranches: any[] = assign["&"] ?? [assign["|"]]
        if (base["|"]) {
            return { "&": [base["|"], ...assignBranches] }
        }
        base["&"].push(...assignBranches)
        return base
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

type KeyWithImplications = "divisor" | "regex" //| "bounds"

type ImplicationsThunk = () => Attributes

const implicationMap: {
    [k in KeyWithImplications]: ImplicationsThunk
} = {
    divisor: () => ({ type: "number" }),
    // bounds: () => ({
    //     branches: [
    //         "|",
    //         { type: "number" },
    //         { type: "string" },
    //         { type: "array" }
    //     ]
    // }),
    regex: () => ({ type: "string" })
}

const alwaysIntersectedKeys = {
    optional: true
}

const isEmpty = (
    intersection: unknown
): intersection is EmptyIntersectionResult => Array.isArray(intersection)

export type EmptyIntersectionResult<
    k extends ContradictableKey = ContradictableKey
> = [baseConflicting: AttributeTypes[k], assignConflicting: AttributeTypes[k]]

export type Intersector<k extends AttributeKey> = (
    base: AttributeTypes[k],
    value: AttributeTypes[k],
    context: DynamicParserContext
) =>
    | AttributeTypes[k]
    | (k extends ContradictableKey ? EmptyIntersectionResult<k> : never)
