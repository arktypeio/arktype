import type { defined } from "../../utils/generics.js"
import type { Comparison } from "../node.js"

type LiteralValue = string | number | boolean

type LiteralableAttributes = {
    readonly literal?: LiteralValue | undefined
}

type LiteralChecker<attributes extends LiteralableAttributes> = (
    value: defined<attributes["literal"]>,
    attributes: attributes
) => boolean

export const compareIfLiteral = <attributes extends LiteralableAttributes>(
    l: attributes,
    r: attributes,
    checker: LiteralChecker<attributes>
): Comparison<attributes> | undefined => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal ? [null, l, null] : [l, null, r]
        }
        return checker(l.literal as any, r) ? [l, l, null] : [l, null, r]
    }
    if (r.literal !== undefined) {
        return checker(r.literal as any, l) ? [null, r, r] : [l, null, r]
    }
}
