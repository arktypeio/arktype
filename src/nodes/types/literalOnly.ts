import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { Compare, Intersection } from "../node.js"
import { Never } from "./degenerate.js"

export type LiteralValue = string | number | boolean

type LiteralOnlyType = boolean | bigint

type LiteralOnlyAttributes<t extends LiteralOnlyType> = {
    readonly literal?: t extends bigint ? IntegerLiteral : t
}

export type BigintAttributes = LiteralOnlyAttributes<bigint>

export type BooleanAttributes = LiteralOnlyAttributes<boolean>

export const literalOnlyIntersection: Intersection<
    LiteralOnlyAttributes<LiteralOnlyType>
> = (l, r) => {
    if (l.literal !== undefined && r.literal !== undefined) {
        return l.literal === r.literal ? l : { never: null }
    }
    return l.literal !== undefined ? l : r
}

export const pruneLiteralOnly: Compare<
    LiteralOnlyAttributes<LiteralOnlyType>
> = (l, r) => {
    if (l.literal !== undefined) {
        return l.literal === r.literal ? undefined : null
    }
}

export const checkLiteralOnly = <t extends LiteralOnlyType>(
    data: boolean,
    attributes: LiteralOnlyAttributes<t>
) => attributes.literal === undefined || attributes.literal === data
