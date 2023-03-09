import { composeIntersection, equality } from "../compose.ts"
import type { RuleCompiler } from "./rules.ts"

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

export const compileDivisorCheck = ((divisor, state) =>
    `data % ${divisor} === 0 || ${state.precompileProblem(
        "divisor",
        `${divisor}`
    )}` as const) satisfies RuleCompiler<number>
