import type { CompilationState } from "./compilation.js"
import { Node } from "./node.js"
import { In } from "./utils.js"

export class DivisibilityNode extends Node<"divisor"> {
    // TODO: align kind with node names
    static readonly kind = "divisor"

    constructor(public divisor: number) {
        super(DivisibilityNode, divisor)
    }

    static compile(divisor: number) {
        return `${In} % ${divisor} === 0`
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("divisor", this.divisor))
    }

    static intersect(l: DivisibilityNode, r: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (l.divisor * r.divisor) /
                greatestCommonDivisor(l.divisor, r.divisor)
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
