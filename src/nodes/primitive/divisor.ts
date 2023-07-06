import { In } from "../../compiler/compile.js"
import { NodeBase } from "../base.js"

export class DivisorNode extends NodeBase<number, {}> {
    readonly kind = "divisor"

    compile() {
        return `${In} % ${this.rule} === 0`
    }

    describe() {
        return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
    }
}

// export const intersectDivisors: PrimitiveIntersection<DivisorConfig> = (l, r) =>
//     Math.abs((l * r) / greatestCommonDivisor(l, r))

// // https://en.wikipedia.org/wiki/Euclidean_algorithm
// const greatestCommonDivisor = (l: number, r: number) => {
//     let previous
//     let greatestCommonDivisor = l
//     let current = r
//     while (current !== 0) {
//         previous = current
//         current = greatestCommonDivisor % current
//         greatestCommonDivisor = previous
//     }
//     return greatestCommonDivisor
// }
