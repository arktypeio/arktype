import type { CheckState } from "../../traverse/check.js"
import { composeIntersection, equal } from "../compose.js"

const divisorError = (data, divisor) => `${data} is not divisible by ${divisor}`

export const checkDivisor = (state: CheckState, divisor: number) => {
    if (state.data % divisor !== 0) {
        state.problems.push({
            path: `[${[...state.path].join()}]`,
            reason: divisorError(state.data, divisor)
        })
    }
}

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
