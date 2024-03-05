import type { writeIndivisibleMessage } from "@arktype/schema"
import type { ErrorMessage } from "@arktype/util"
import type { inferAstBase } from "./infer.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> = isDivisible<
	inferAstBase<l, $, args>
> extends true
	? validateAst<l, $, args>
	: ErrorMessage<writeIndivisibleMessage<astToString<l>>>

type isDivisible<data> = [data] extends [number] ? true : false
