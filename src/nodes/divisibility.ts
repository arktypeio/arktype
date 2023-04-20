import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    // TODO: align kind with node names
    static readonly kind = "divisor"

    constructor(public divisor: number) {
        super(DivisibilityNode, divisor)
    }

    static compile(divisor: number): CompiledAssertion {
        return `data % ${divisor} === 0`
    }

    compileTraversal(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("divisor", this.divisor))
    }

    intersect(other: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (this.divisor * other.divisor) /
                greatestCommonDivisor(this.divisor, other.divisor)
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
