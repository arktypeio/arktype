import type { IntegerLiteral } from "../../utils/numericLiterals.js"

type LiteralOnlyType = boolean | bigint

type LiteralOnlyAttributes<t extends LiteralOnlyType> = {
    readonly literal?: t extends bigint ? IntegerLiteral : t
}

export type BigintAttributes = {}

export type BooleanAttributes = LiteralOnlyAttributes<boolean>
