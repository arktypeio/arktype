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
        if (k in left && k in right && left[k] !== right[k]) {
            const reducer = intersectionReducers[k] as (
                left: any,
                right: any
            ) => any
            // TODO: Add implications
            // isKeyOf(key, implications)
            //     ? {
            //           [key]: value,
            //           ...implications[key]
            //       }
            //     : { [key]: value }
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
})

type Implications = Pick<Attributes, "type" | "value" | "branches">

type AttributeImplications = {
    [k in AttributeKey]?: Implications
}

const defineImplications = <implications extends AttributeImplications>(
    implications: implications
) => implications

const implications = defineImplications({
    divisor: { type: "number" },
    bounds: {
        branches: [
            "|",
            { type: "number" },
            { type: "string" },
            { type: "array" }
        ]
    },
    regex: { type: "string" }
})
