import { isKeyOf, throwInternalError } from "../internal.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    IntersectionReducer
} from "./shared.js"

export const intersection = (left: Attributes, right: Attributes) => {
    const intersection = { ...left, ...right }
    let k: AttributeKey
    for (k in intersection) {
        if (isKeyOf(k, implicationReducers)) {
            const implications = implicationReducers[k]()
            let impliedKey: ImpliableKey
            for (impliedKey in implications) {
                intersection[impliedKey] =
                    impliedKey in intersection
                        ? (intersectionReducers as DynamicIntersectionReducers)[
                              impliedKey
                          ](intersection[impliedKey], implications[impliedKey])
                        : implications[impliedKey]
            }
        }
        if (k in left && k in right && left[k] !== right[k]) {
            intersection[k] = (
                intersectionReducers as DynamicIntersectionReducers
            )[k](left[k], right[k])
        }
    }
    return intersection
}

type DynamicIntersectionReducers = {
    [k in AttributeKey]: (left: any, right: any) => any
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
    baseProp: (left, right) => intersection(left, right),
    props: (left, right) => {
        const intersectedProps = { ...left, ...right }
        for (const k in intersectedProps) {
            if (k in left && k in right) {
                intersectedProps[k] = intersection(left[k], right[k])
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
    parent: (left, right) => {
        return throwInternalError(
            `Unexpectedly tried to intersect parents:\n${JSON.stringify(
                left
            )}\n${JSON.stringify(right)}`
        )
    }
}

type Implications = Pick<Attributes, ImpliableKey>

type ImpliableKey = "type" | "branches"

type KeyWithImplications = "divisor" | "bounds" | "regex"

const implicationReducers: Record<KeyWithImplications, () => Implications> = {
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
