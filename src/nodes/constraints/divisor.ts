import { In } from "../compilation.js"
import { BaseNode } from "../node.js"

export class DivisorNode extends BaseNode<typeof DivisorNode> {
    static readonly kind = "divisor"

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
