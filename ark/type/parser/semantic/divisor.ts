import type { Root, writeIndivisibleMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { inferAstIn } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> =
	inferAstIn<l, $, args> extends infer data ?
		[data] extends [number] ?
			validateAst<l, $, args>
		:	ErrorMessage<writeIndivisibleMessage<Root<data>>>
	:	never
