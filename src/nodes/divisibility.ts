import type { CompilationState } from "./node.js"
import { Node } from "./node.js"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    constructor(divisor: number) {
        super(DivisibilityNode, divisor)
    }

    intersect(other: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (this.child * other.child) /
                greatestCommonDivisor(this.child, other.child)
        )
        return new DivisibilityNode(leastCommonMultiple)
    }

    static compile(divisor: number, s: CompilationState) {
        return s.check(
            "divisor",
            `${s.data} % ${divisor} === 0` as const,
            divisor
        )
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
