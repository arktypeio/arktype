import { In } from "../../compile/compile.js"
import { defineNodeKind } from "../node.js"

// export const DivisorNode = defineNodeKind<number>(
//     {
//         kind: "divisor",
//         compile: (rule) => `${In} % ${rule} === 0`,
//         create: (base) => base
//     },
//     (l, r) => {
//         return DivisorNode(
//             Math.abs((l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule))
//         )
//     }
// )

// export class DivisorNode implements ConditionNode<"divisor"> {
//     readonly kind = "divisor"
//     readonly precedence = 3

//     constructor(public rule: number) {
//         const condition = `${In} % ${rule} === 0`
//         if (nodeCache.divisor[condition]) {
//             return nodeCache.divisor[condition]!
//         }
//     }

//     intersect(other: DivisorNode) {
//         return new DivisorNode(
//             Math.abs(
//                 (this.rule * other.rule) /
//                     greatestCommonDivisor(this.rule, other.rule)
//             )
//         )
//     }

//     toString() {
//         return `a multiple of ${this.rule}`
//     }
// }

// compile: (n, condition, s) => s.ifNotThen(condition, s.problem("divisor", n))

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
