import { composePredicateIntersection, equivalence } from "./compose.js"

export const checkDivisor = (data: number, divisor: number) =>
    data % divisor === 0

export const divisorIntersection = composePredicateIntersection<number>(
    (l: number, r: number) =>
        l === r ? equivalence : Math.abs((l * r) / greatestCommonDivisor(l, r))
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
