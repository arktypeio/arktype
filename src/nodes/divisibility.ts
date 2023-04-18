import type { CompilationState } from "./node.js"
import { Node } from "./node.js"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    constructor(divisor: number) {
        super(DivisibilityNode, divisor)
    }

    static compileChildren(divisor: number, s: CompilationState) {
        return [
            {
                condition: `${s.data} % ${divisor} !== 0`,
                problem: s.problem("divisor", divisor)
            }
        ]
    }

    intersect(other: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (this.child * other.child) /
                greatestCommonDivisor(this.child, other.child)
        )
        return new DivisibilityNode(leastCommonMultiple)
    }
}

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
