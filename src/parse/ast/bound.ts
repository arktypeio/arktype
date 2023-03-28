import type { SizedData } from "../../utils/data.ts"
import type { error, isAny } from "../../utils/generics.ts"
import type { NumberLiteral } from "../../utils/numericLiterals.ts"
import type { inferAst, validateAst } from "./ast.ts"
import type { astToString } from "./utils.ts"

/**
 * @operator {@link validateBound | bound}
 * @docgenTable
 * @string "N<S<N", with comparators restricted to `<` or `<=`
 * @param N: number literal
 * @param S: sized data (a number, string or array)
 * @param <: Comparator (one of  "<", "<=", "==", ">=", ">")
 * @comparators [<,>,<=,>=,==]
 * @Bound "S<N"
 * @Range "N<S<N", with comparators restricted to `<` or `<=`
 * @example "string<5"
 * @example "2>=number>=5"
 * @example "string[]===5"
 * @example
 * const abc = 2
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
