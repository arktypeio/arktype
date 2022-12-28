import type { CheckState } from "../../traverse/check.js"
import { addProblem } from "../../traverse/errors.js"
import { composeIntersection, equal } from "../compose.js"

export const divisorError = (data: number, divisor: number) =>
    `${data} is not divisible by ${divisor}`

export const checkDivisor = (state: CheckState<number>, divisor: number) => {
    if (state.data % divisor !== 0) {
        addProblem(state, divisorError(state.data, divisor))
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
