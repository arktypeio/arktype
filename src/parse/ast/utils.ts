import type { Literalable } from "../../utils/generics.js"

export type astToString<ast> = `'${astToStringRecurse<ast, "">}'`

type astToStringRecurse<ast, result extends string> = ast extends [
    infer head,
    ...infer tail
]
    ? astToStringRecurse<tail, `${result}${astToStringRecurse<head, "">}`>
    : ast extends Literalable
    ? `${result}${ast extends bigint ? `${ast}n` : ast}`
    : "..."
