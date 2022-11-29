import type { defined } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Never } from "./degenerate.js"

type LiteralValue = string | number | boolean

type LiteralableAttributes = {
    readonly literal?: LiteralValue | undefined
}

type LiteralChecker<attributes extends LiteralableAttributes> = (
    value: defined<attributes["literal"]>,
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
            return l.literal === r.literal ? l : { never: `${l} !== ${r}` }
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

const createUnsatisfyingLiteralNever = (
    literal: LiteralValue,
    attributes: dict
): Never => ({
    never: `${literal} does not satisfy ${JSON.stringify(attributes)}`
})
