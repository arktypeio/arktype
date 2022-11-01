import { isKeyOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes,
    IntersectionReducer
} from "./shared.js"

export const intersect = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
) => {
    let k: AttributeKey
    for (k in assign) {
        // TODO: Value undefined?
        if (base[k] === assign[k]) {
            continue
        }
        if (isKeyOf(k, implicationReducers)) {
            intersect(
                base,
                dynamicImplicationReducers[k](assign[k], context),
                context
            )
        }
        if (k in base) {
            base[k] = dynamicIntersectionReducers[k](
                base[k],
                assign[k],
                context
            )
        } else {
            base[k] = assign[k] as any
        }
    }
    return base
}

type IntersectionReducers = {
    [k in AttributeKey]: IntersectionReducer<k>
}

const intersectionReducers: IntersectionReducers = {
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
    baseProp: (left, right, context) => intersect(left, right, context),
    props: (left, right, context) => {
        const intersectedProps = { ...left, ...right }
        for (const k in intersectedProps) {
            if (k in left && k in right) {
                intersectedProps[k] = intersect(left[k], right[k], context)
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

const dynamicIntersectionReducers = intersectionReducers as {
    [k in AttributeKey]: (
        left: unknown,
        right: unknown,
        context: DynamicParserContext
    ) => any
}

type KeyWithImplications = "divisor" | "bounds" | "regex" | "alias"

type ImplicationReducer<K extends KeyWithImplications> = (
    value: AttributeTypes[K],
    context: DynamicParserContext
) => Attributes

const implicationReducers: {
    [k in KeyWithImplications]: ImplicationReducer<k>
} = {
    divisor: () => ({ type: "number" }),
    bounds: () => ({
        branches: [
            "|",
            { type: "number" },
            { type: "string" },
            { type: "array" }
        ]
    }),
    regex: () => ({ type: "string" })
}

const dynamicImplicationReducers = implicationReducers as {
    [k in KeyWithImplications]: (
        value: unknown,
        context: DynamicParserContext
    ) => Attributes
}
