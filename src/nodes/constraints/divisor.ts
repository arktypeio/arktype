import { type CompilationState, In } from "../compilation.js"
import { Node } from "../node.js"

export class DivisorNode extends Node<"divisor", [number]> {
    readonly subclass = DivisorNode

    static readonly kind = "divisor"

    static compile(children: number[]) {
        return `${In} % ${children[0]} === 0`
    }

    get child() {
        return this.children[0]
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("divisor", this.child))
    }

    toString() {
        return `a multiple of ${this.child}`
    }

    intersectNode(r: DivisorNode) {
        const leastCommonMultiple = Math.abs(
            (this.child * r.child) / greatestCommonDivisor(this.child, r.child)
        )
        return new DivisorNode(leastCommonMultiple)
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
