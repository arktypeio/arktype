export const checkDivisor = (data: number, divisor: number) =>
    data % divisor === 0

export const divisorIntersection = (l: number, r: number) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

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
