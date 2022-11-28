import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { IntersectionFn, PruneFn } from "../node.js"

type LiteralOnlyType = boolean | bigint

type LiteralOnlyAttributes<t extends LiteralOnlyType> = {
    readonly literal?: t extends bigint ? IntegerLiteral : t
}

export type BigintAttributes = LiteralOnlyAttributes<bigint>

export type BooleanAttributes = LiteralOnlyAttributes<boolean>

export const literalOnlyIntersection: IntersectionFn<
    LiteralOnlyAttributes<LiteralOnlyType>
> = (l, r) => {
    if (l.literal !== undefined && r.literal !== undefined) {
        return l.literal === r.literal
            ? l
            : { never: `${l.literal} and ${r.literal} have no overlap` }
    }
    return l.literal !== undefined ? l : r
}

export const pruneLiteralOnly: PruneFn<
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
