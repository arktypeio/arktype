import type { writeIndivisibleMessage } from "@arktype/schema"
import type { ErrorMessage } from "@arktype/util"
import type { inferAst } from "./semantic.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDivisor<l, $, args> = isDivisible<
	inferAst<l, $, args>
> extends true
	? validateAst<l, $, args>
	: ErrorMessage<writeIndivisibleMessage<astToString<l>>>

type isDivisible<data> = [data] extends [number] ? true : false
