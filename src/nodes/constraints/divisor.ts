import { In } from "../compilation.js"
import { BaseNode, defineNode } from "../node.js"

export const DivisorNode = defineNode(
    class DivisorNode extends BaseNode<number> {
        readonly kind = "divisor"

        static compile(rule: number) {
            return [`${In} % ${rule} === 0`]
        }

        computeIntersection(other: this) {
            return Math.abs(
                (this.rule * other.rule) /
                    greatestCommonDivisor(this.rule, other.rule)
            )
        }

        describe() {
            return `a multiple of ${this.rule}`
        }
    }
)

export type DivisorNode = ReturnType<typeof DivisorNode>

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
