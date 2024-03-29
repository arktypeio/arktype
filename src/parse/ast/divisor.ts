import type { error, isAny } from "../../utils/generics.js"
import type { inferAst, validateAst } from "./ast.js"
import type { astToString } from "./utils.js"

/**
 * @operator {@link validateDivisor | %}
 * @docgenTable
 * @string "N%D", where "N" is a number and "D" is a non-zero integer
 */
export type validateDivisor<l, $> = isDivisible<inferAst<l, $>> extends true
    ? validateAst<l, $>
    : error<writeIndivisibleMessage<astToString<l>>>

type isDivisible<data> = isAny<data> extends true
    ? false
    : [data] extends [number]
    ? true
    : false

export const writeIndivisibleMessage = <root extends string>(
    root: root
): writeIndivisibleMessage<root> =>
    `Divisibility operand ${root} must be a number`

type writeIndivisibleMessage<root extends string> =
    `Divisibility operand ${root} must be a number`
