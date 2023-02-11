import type { SizedData } from "../../utils/data.ts"
import type { error, isAny } from "../../utils/generics.ts"
import type { inferAst, validateSemantics } from "./ast.ts"
import type { astToString } from "./utils.ts"

export type validateBound<l, r, $> = l extends number
    ? validateSemantics<r, $>
    : isBoundable<inferAst<l, $>> extends true
    ? validateSemantics<l, $>
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
