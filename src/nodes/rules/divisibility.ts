import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"

export class DivisibilityNode extends Node<DivisibilityNode> {
    constructor(public readonly children: number) {
        super(`${children}`)
    }

    intersect(other: DivisibilityNode) {
        const leastCommonMultiple = Math.abs(
            (this.children * other.children) /
                greatestCommonDivisor(this.children, other.children)
        )
        return new DivisibilityNode(leastCommonMultiple)
    }

    compile(c: Compilation) {
        return c.check(
            "divisor",
            `${c.data} % ${this.children} === 0` as const,
            this.children
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
