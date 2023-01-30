import type { TraversalCheck } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
import { composeIntersection, equality } from "../compose.ts"

export const divisorIntersection = composeIntersection<number>(
    (l: number, r: number) =>
        l === r ? equality() : Math.abs((l * r) / greatestCommonDivisor(l, r))
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

export type DivisibilityContext = defineProblem<{
    code: "divisibility"
    data: number
    divisor: number
}>

export const writeDivisorError: ProblemMessageWriter<"divisibility"> = ({
    data,
    divisor
}) =>
    divisor === 1
        ? `${data} is not an integer.`
        : `${data} is not divisible by ${divisor}.`

export const checkDivisor = ((data, divisor, state) => {
    if (data % divisor !== 0) {
        state.addProblem({
            code: "divisibility",
            data,
            divisor
        })
    }
}) satisfies TraversalCheck<"divisor">
