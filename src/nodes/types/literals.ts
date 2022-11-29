import type { defined } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Never } from "./degenerate.js"

type LiteralValue = string | number | boolean

export type LiteralableAttributes = {
    readonly literal?: LiteralValue | undefined
}

export type LiteralChecker<attributes extends LiteralableAttributes> = (
    data: defined<attributes["literal"]>,
    attributes: attributes
) => boolean

export const literalableIntersection = <
    attributes extends LiteralableAttributes
>(
    l: attributes,
    r: attributes,
    checker: LiteralChecker<attributes>
): attributes | Never | undefined => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal
                ? l
                : createUnequalLiteralsNever(l.literal, r.literal)
        }
        return checker(l.literal as any, r)
            ? l
            : createUnsatisfyingLiteralNever(l.literal, r)
    }
    if (r.literal !== undefined) {
        return checker(r.literal as any, l)
            ? r
            : createUnsatisfyingLiteralNever(r.literal, l)
    }
}

export const createUnsatisfyingLiteralNever = (
    literal: LiteralValue,
    attributes: dict
): Never => ({
    never: `${literal} does not satisfy ${JSON.stringify(attributes)}`
})

export const createUnequalLiteralsNever = (
    l: LiteralValue,
    r: LiteralValue
) => ({
    never: `${l} !== ${r}`
})
