import type { EntryChecker } from "../../traverse/traverse.ts"
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

export const checkDivisor: EntryChecker<"divisor"> = (divisor, state) =>
    state.data % divisor === 0 || state.problems.create("divisor", divisor)
