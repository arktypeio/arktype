import type { error } from "@arktype/util"
import type { inferAst } from "./semantic.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> = isDivisible<
	inferAst<l, $, args>
> extends true
	? validateAst<l, $, args>
	: error<writeIndivisibleMessage<astToString<l>>>

type isDivisible<data> = [data] extends [number] ? true : false
