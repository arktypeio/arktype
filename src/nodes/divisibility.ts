import type { CompilationState } from "./node.ts"
import { Node } from "./node.ts"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    constructor(rule: number) {
        super(DivisibilityNode, rule)
    }

    static intersection(l: DivisibilityNode, r: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
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
