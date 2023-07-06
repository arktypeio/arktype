import { InputParameterName } from "../../compile/compile.js"
import type { BaseNodeMeta } from "../node.js"
import { defineNode } from "../node.js"
import type {
    definePrimitive,
    PrimitiveIntersection,
    PrimitiveNode
} from "./primitive.js"

export interface DivisorMeta extends BaseNodeMeta {}

export type DivisorConfig = definePrimitive<{
    kind: "divisor"
    rule: number
    meta: DivisorMeta
    intersection: number
}>

export interface DivisorNode extends PrimitiveNode<DivisorConfig> {}

export const intersectDivisors: PrimitiveIntersection<DivisorConfig> = (l, r) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

export const divisorNode = defineNode<DivisorNode>(
    {
        kind: "divisor",
        compile: (rule) => `${InputParameterName} % ${rule} === 0`
    },
    (base) => {
        return {
            description:
                base.rule === 1 ? "an integer" : `a multiple of ${base.rule}`
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
