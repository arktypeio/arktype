import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection } from "../compose.ts"
import { Problem } from "../problems.ts"

export const intersectDivisors = composeIntersection<number>((l, r) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))
)

export const compileDivisor = (divisor: number, c: Compilation) =>
    c.check("divisor", `${c.data} % ${divisor} === 0` as const, divisor)

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

export class DivisorProblem extends Problem<number> {
    readonly code = "divisor"

    constructor(public divisor: number, data: number, path: Path) {
        super(data, path)
    }

    get mustBe() {
        return this.divisor === 1
            ? `an integer`
            : `a multiple of ${this.divisor}`
    }
}
