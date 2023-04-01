import type { CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    constructor(public readonly divisor: number) {
        super(DivisibilityNode, divisor)
    }

    static intersect(l: DivisibilityNode, r: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (l.divisor * r.divisor) /
                greatestCommonDivisor(l.divisor, r.divisor)
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
