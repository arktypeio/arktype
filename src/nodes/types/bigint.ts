import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { Compare } from "../node.js"
import { literalableIntersection } from "./literals.js"

export type BigintAttributes = {
    readonly literal: IntegerLiteral
}

export const compareBigints: Compare<BigintAttributes> = (l, r) =>
    literalableIntersection(l, r, checkBigint)!

export const checkBigint = (
    data: IntegerLiteral,
    attributes: BigintAttributes
) => attributes.literal === undefined || attributes.literal === data
