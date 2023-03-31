import type { SizedData } from "../../utils/data.ts"
import type { error, isAny } from "../../utils/generics.ts"
import type { NumberLiteral } from "../../utils/numericLiterals.ts"
import type { inferAst, validateAst } from "./ast.ts"
import type { astToString } from "./utils.ts"

/**
 * @operator {@link validateBound | bound}
 * @docgenTable
 *  * @tableRow N number literal
 * @tableRow S sized data (a number, string or array)
 * @tableRow < Comparator (one of <, <=, ==, >=, >)
 * @description
 * Bound operators allow data to be bounded in the format "S<N", or as a Range: "N<S<N", with comparators restricted to < or <=
 * @string "N<S<N", with comparators restricted to < or <=
 * @example string
 *  const range = type("2<=number<5")
 * @example string
 *  const bound = type("string[]==5")
 */
export type validateBound<l, r, $> = l extends NumberLiteral
    ? validateAst<r, $>
    : isBoundable<inferAst<l, $>> extends true
    ? validateAst<l, $>
    : error<writeUnboundableMessage<astToString<l>>>

type isBoundable<data> = isAny<data> extends true
    ? false
    : [data] extends [SizedData]
    ? true
    : false

export const writeUnboundableMessage = <root extends string>(
    root: root
): writeUnboundableMessage<root> =>
    `Bounded expression ${root} must be a number, string or array`

type writeUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a number, string or array`
