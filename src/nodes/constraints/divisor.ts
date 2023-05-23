import { In } from "../compilation.js"
import { defineNode } from "../node.js"

export const DivisorNode = defineNode(
    (n: number) => `${In} % ${n} === 0`,
    (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r)),
    (base) =>
        class Node extends base {
            readonly kind = "divisor"

            describe() {
                return `a multiple of ${this.rule}`
            }

            foo() {
                return "bar"
            }
        }
)

const z = DivisorNode(5)

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
