import { In } from "../compiler/compile.js"
import { NodeBase } from "../nodes/base.js"
import type { Constraint } from "./constraint.js"
import { ConstraintSet } from "./constraint.js"

export interface DivisorConstraint extends Constraint {
    readonly divisor: number
}

export class DivisorSet extends ConstraintSet<[DivisorConstraint]> {
    add(constraint: DivisorConstraint) {
        return new DivisorSet({
            divisor: Math.abs(
                (this[0].divisor * constraint.divisor) /
                    greatestCommonDivisor(this[0].divisor, constraint.divisor)
            )
        })
    }
}

export class DivisorNode extends NodeBase<{
    rule: number
    meta: {}
    intersection: DivisorNode
}> {
    readonly kind = "divisor"

    compile() {
        return `${In} % ${this.rule} === 0`
    }

    intersect(other: DivisorNode) {
        return new DivisorNode(
            Math.abs(
                (this.rule * other.rule) /
                    greatestCommonDivisor(this.rule, other.rule)
            ),
            // TODO: fix meta intersections
            this.meta
        )
    }

    describe() {
        return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
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
