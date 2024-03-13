import type { ErrorMessage } from "@arktype/util"
import type { writeIndivisibleMessage } from "../../constraints/refinements/divisor.js"
import type { Type } from "../../types/type.js"
import type { inferAstBase } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> = inferAstBase<
	l,
	$,
	args
> extends infer data
	? [data] extends [number]
		? validateAst<l, $, args>
		: ErrorMessage<writeIndivisibleMessage<Type<data>>>
	: never
