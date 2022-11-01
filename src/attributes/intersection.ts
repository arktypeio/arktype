import { isKeyOf } from "../internal.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes,
    IntersectionReducer
} from "./shared.js"

export const intersect = (left: Attributes, right: Attributes) => {
    const intersection = { ...left, ...right }
    let k: AttributeKey
    for (k in intersection) {
        intersectKey(intersection, k, intersection[k])
    }
    return intersection
}

type IntersectionReducers = {
    [k in AttributeKey]: IntersectionReducer<k>
}

const intersectKey = <k extends AttributeKey>(
    intersection: Attributes,
    k: k,
    value: AttributeTypes[k]
) => {
    if (isKeyOf(k, implicationReducers)) {
        const implications = implicationReducers[k]()
        let impliedKey: ImpliableKey
        for (impliedKey in implications) {
            intersectKey(
                intersection,
                impliedKey,
                implications[impliedKey] as any
            )
        }
    }
    if (k in intersection) {
        if (intersection[k] !== value) {
            intersection[k] = intersectionReducers[k](
                intersection[k] as any,
                value
            ) as any
        }
    } else {
        intersection[k] = value
    }
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
    baseProp: (left, right) => intersect(left, right),
    props: (left, right) => {
        const intersectedProps = { ...left, ...right }
        for (const k in intersectedProps) {
            if (k in left && k in right) {
                intersectedProps[k] = intersect(left[k], right[k])
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
