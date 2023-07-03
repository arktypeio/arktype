import { InputParameterName } from "../../compile/compile.js"
import {
    type Constraint,
    definePrimitiveNode,
    type PrimitiveNode
} from "./primitive.js"

export type DivisorConstraint = Constraint<"divisor", number, {}>

export interface DivisorNode extends PrimitiveNode<[DivisorConstraint]> {
    rule: number
}

export const divisorNode = definePrimitiveNode<DivisorNode>(
    {
        kind: "divisor",
        parse: (input) => input,
        compileRule: (rule) => `${InputParameterName} % ${rule} === 0`,
        intersect: (l, r) =>
            Math.abs((l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule))
    },
    (base) => {
        const rule = base.children[0].rule
        return {
            rule,
            description: rule === 1 ? "an integer" : `a multiple of ${rule}`
        }
    }
)

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
