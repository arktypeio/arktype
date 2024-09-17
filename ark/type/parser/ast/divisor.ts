import type { writeIndivisibleMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { inferAstIn } from "./infer.ts"
import type { validateAst } from "./validate.ts"

export type validateDivisor<l, $, args> =
	inferAstIn<l, $, args> extends infer data ?
		[data] extends [number] ?
			validateAst<l, $, args>
		:	ErrorMessage<writeIndivisibleMessage<data>>
	:	never
