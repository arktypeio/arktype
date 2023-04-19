import { CompiledAssertion, Node } from "./node.js"

export class DivisibilityNode extends Node<typeof DivisibilityNode> {
    constructor(public divisor: number) {
        super(DivisibilityNode, divisor)
    }

    static compile(divisor: number): CompiledAssertion {
        return `data % ${divisor} !== 0`
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
