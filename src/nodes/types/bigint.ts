import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import { composeIntersection } from "./compose.js"
import type { LiteralChecker } from "./literals.js"

export type BigintAttributes = {
    readonly literal: IntegerLiteral
}

export const checkBigint: LiteralChecker<BigintAttributes> = (
    data,
    attributes
) => attributes.literal === undefined || attributes.literal === data

export const bigintIntersection = composeIntersection<BigintAttributes>({
    literal: checkBigint
})
