import type { Compilation } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { defineProblemConfig } from "../problems.ts"

export const intersectDivisors = composeIntersection<number>((l, r) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))
)

export const compileDivisor = (divisor: number, c: Compilation) =>
    c.check("divisor", `${c.data} % ${divisor} === 0` as const, divisor)

export const divisorProblemConfig = defineProblemConfig("divisor", {
    mustBe: (divisor) =>
        divisor === 1 ? `an integer` : `a multiple of ${divisor}`
})

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
