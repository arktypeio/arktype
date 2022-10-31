import { throwInternalError } from "../internal.js"
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
    let k: keyof Attributes
    for (k in intersection) {
        if (k in left && k in right) {
            const reducer = intersectionReducers[k] as (
                left: any,
                right: any
            ) => any
            intersection[k] = reducer(left[k], right[k])
        }
    }
    return intersection
}

const defineIntersectionReducers = <
    intersections extends {
        [key in AttributeKey]: IntersectionReducer<key>
    }
>(
    intersections: intersections
) => intersections

const intersectionReducers = defineIntersectionReducers({
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
        const intersection = { ...left, ...right }
        for (const k in intersection) {
            if (k in left && k in right) {
                intersection[k] = intersection(left[k], right[k])
            }
        }
        return intersection
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
})
