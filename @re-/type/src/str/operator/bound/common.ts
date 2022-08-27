export * from "../common.js"
import { Keyword } from "../../operand/index.js"
import { Parser, strNode } from "../common.js"

export const comparators = Parser.tokenSet({
    "<": 1,
    ">": 1,
    ">=": 1,
    "<=": 1,
    "==": 1
})

export type Comparator = keyof typeof comparators

export const comparatorChars = Parser.tokenSet({
    "<": 1,
    ">": 1,
    "=": 1
})

export type ComparatorChar = keyof typeof comparatorChars

export type boundChecker = (y: number) => boolean

export type normalizedBound = [Comparator, number]

export const createBoundChecker = ([token, x]: normalizedBound) => {
    switch (token) {
        case "<=":
            return (y: number) => y <= x
        case ">=":
            return (y: number) => y >= x
        case "<":
            return (y: number) => y < x
        case ">":
            return (y: number) => y > x
        case "==":
            return (y: number) => y === x
        default:
            throw new Error(`Unexpected comparator ${token}.`)
    }
}

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export interface boundableNode extends strNode {
    boundBy?: string
    toBound(value: unknown): number
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: strNode): node is boundableNode =>
    "toBound" in node

export type boundValidationError = {
    comparator: Comparator
    limit: number
    actual: number
    source: BoundableValue
}
