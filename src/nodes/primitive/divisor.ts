import { compileCheck, InputParameterName } from "../../compile/compile.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface DivisorNode extends BaseNode<{ rule: number }> {}

export const divisorNode = defineNodeKind<DivisorNode>(
    {
        kind: "divisor",
        parse: (input) => input,
        compile: (rule, ctx) =>
            compileCheck(
                "divisor",
                rule,
                `${InputParameterName} % ${rule} === 0`,
                ctx
            ),
        intersect: (l, r): DivisorNode =>
            divisorNode(
                Math.abs(
                    (l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
                )
            )
    },
    (base) => ({
        description:
            base.rule === 1 ? "an integer" : `a multiple of ${base.rule}`
    })
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
