export const intersectDivisors = (left: number, right: number) =>
    leastCommonMultiple(left, right)

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (x: number, y: number) => {
    let previous
    let greatestCommonDivisor = x
    let current = y
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((x * y) / greatestCommonDivisor)
}
