import { isKeyOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    Intersector
} from "./shared.js"
import { isContradiction } from "./shared.js"

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
            const result = dynamicReducers[k](base[k], assign[k], context)
            // TODO: Better way to do deal with contradictions?
            if (isContradiction(result)) {
                base.contradictions ??= []
                base.contradictions.push(result)
            } else {
                base[k] = result
            }
        } else {
            base[k] = assign[k] as any
        }
        if (isKeyOf(k, implicationMap)) {
            assignIntersection(
                base,
                dynamicImplicationMap[k](base[k], context),
                context
            )
        }
    }
    return base
}

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: (left, right) => ({
        key: "value",
        contradiction: [left, right]
    }),
    type: (left, right) => ({
        key: "type",
        contradiction: [left, right]
    }),
    divisor: (left, right) => intersectDivisors(left, right),
    regex: (left, right) => `${left}${right}`,
    bounds: intersectBounds,
    optional: (left, right) => left && right,
    alias: (left, right) => `${left}&${right}`,
    baseProp: (left, right, context) =>
        assignIntersection(left, right, context),
    props: (left, right, context) => {
        const intersectedProps = { ...left, ...right }
        for (const k in intersectedProps) {
            if (k in left && k in right) {
                intersectedProps[k] = assignIntersection(
                    left[k],
                    right[k],
                    context
                )
            }
        }
        return intersectedProps
    },
    branches: (
        ...leftAndRightBranches: [AttributeBranches, AttributeBranches]
    ) => {
        const intersectionBranches: AttributeBranches = ["&"]
        for (const operandBranches of leftAndRightBranches) {
            if (operandBranches[0] === "|") {
                intersectionBranches.push(operandBranches)
            } else {
                for (let i = 1; i < operandBranches.length; i++) {
                    intersectionBranches.push(operandBranches[i])
                }
            }
        }
        return intersectionBranches
    },
    contradictions: (left, right) => [...left, ...right]
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (
        left: unknown,
        right: unknown,
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

const dynamicImplicationMap = implicationMap as {
    [k in KeyWithImplications]: (
        value: unknown,
        context: DynamicParserContext
    ) => Attributes
}

const alwaysIntersectedKeys = {
    optional: true
}
