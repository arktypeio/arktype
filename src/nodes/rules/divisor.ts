import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
import type { RuleDefinition } from "./rules.ts"

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

export const compileDivisorCheck = (divisor: number, c: Compilation) =>
    c.check("divisor", `${c.data} % ${divisor} === 0` as const, divisor)

export const divisibility: RuleDefinition<number> = {
    intersection: (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r)),
    compile: (divisor, c) =>
        c.check("divisor", `${c.data} % ${divisor} === 0` as const, divisor)
}
