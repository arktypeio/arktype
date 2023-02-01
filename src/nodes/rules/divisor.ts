import type { TraversalCheck } from "../../traverse/check.ts"
import type { defineProblem } from "../../traverse/problems.ts"
import { composeIntersection, equality } from "../compose.ts"

export const divisorIntersection = composeIntersection<number>(
    (l: number, r: number) =>
        l === r ? equality() : Math.abs((l * r) / greatestCommonDivisor(l, r))
)

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
    let previous
    let greatestCommonDivisor = l
    let current = r
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}

export type DivisibilityContext = defineProblem<{
    code: "divisibility"
    data: number
    divisor: number
}>

export const checkDivisor = ((data, divisor, state) => {
    if (data % divisor !== 0) {
        state.problems.addProblem({
            code: "divisibility",
            data,
            divisor,
            description:
                divisor === 1 ? `an integer` : `divisible by ${divisor}`
        })
    }
}) satisfies TraversalCheck<"divisor">
