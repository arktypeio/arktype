import type { defined } from "../../utils/generics.js"

export type LiteralValue = string | number | boolean

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
): attributes | "never" | undefined => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal ? l : "never"
        }
        return checker(l.literal as any, r) ? l : "never"
    }
    if (r.literal !== undefined) {
        return checker(r.literal as any, l) ? r : "never"
    }
}
