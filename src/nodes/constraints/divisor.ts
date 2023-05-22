import { In } from "../compilation.js"
import { defineNode } from "../node.js"

export const DivisorNode = defineNode<number>()({
    kind: "divisor",
    condition: (n) => `${In} % ${n} === 0`,
    describe: (n) => `a multiple of ${n}`,
    intersect: (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r))
})

// compile: (n, condition, s) => s.ifNotThen(condition, s.problem("divisor", n))

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
