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

export const assignIntersection = (
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
            assignIntersection(
                base,
                dynamicImplicationReducers[k](assign[k], context),
                context
            )
        }
        if (k in base) {
            base[k] = dynamicReducers[k](base[k], assign[k], context)
        } else {
            base[k] = assign[k] as any
        }
    }
    return base
}

// TODO: Do most reducers not need context? only alias?
type Reducers = {
    [k in AttributeKey]: IntersectionReducer<k>
}

const reducers: Reducers = {
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
    alias: (left, right) => `${left}${right}`,
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

const dynamicReducers = reducers as {
    [k in AttributeKey]: (
        left: unknown,
        right: unknown,
        context: DynamicParserContext
    ) => any
}

type KeyWithImplications = "divisor" | "bounds" | "regex"

type ImplicationReducer<k extends KeyWithImplications> = (
    value: AttributeTypes[k],
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
