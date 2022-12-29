import type { CheckState, TraversalCheck } from "../../traverse/check.ts"
import { DiagnosticMessageBuilder } from "../../traverse/problems.ts"
import { composeIntersection, equal } from "../compose.ts"

export const divisorIntersection = composeIntersection<number>(
    (l: number, r: number) =>
        l === r ? equal : Math.abs((l * r) / greatestCommonDivisor(l, r))
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

export type DivisorErrorContext = { value: number; divisor: number }

export const buildDivisorError: DiagnosticMessageBuilder<
    "DivisorViolation"
> = ({ value, divisor }) =>
    divisor === 1
        ? `${value} is not an integer.`
        : `${value} is not divisible by ${divisor}.`

export const checkDivisor = ((state, divisor) => {
    if (state.data % divisor !== 0) {
        state.problems.addProblem(state, { value: state.data, divisor })
    }
}) satisfies TraversalCheck<"divisor">
