import type { TraversalCheck, TraversalState } from "../../traverse/check.ts"
import type { ProblemDescriptionsWriter } from "../../traverse/problems.ts"
import { Problem } from "../../traverse/problems.ts"
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

export const checkDivisor = ((data, divisor, state) => {
    if (data % divisor !== 0) {
        state.problems.add(new DivisibilityProblem(divisor, state, data))
    }
}) satisfies TraversalCheck<"divisor">

export type DivisibilityContext = {
    data: number
    divisor: number
}

export const describeDivisibility: ProblemDescriptionsWriter<"divisibility"> = (
    input
) => ({
    mustBe: input.divisor === 1 ? `an integer` : `divisible by ${input.divisor}`
})
