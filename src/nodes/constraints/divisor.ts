import { In } from "../../compile/compile.js"
import { defineNodeKind } from "../node.js"

export const DivisorNode = defineNodeKind({
    kind: "divisor",
    compile: (rule: number) => `${In} % ${rule} === 0`,
    intersect: (l, r) =>
        Math.abs((l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)),
    describe: (rule) => `a multiple of ${rule}`
})

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
