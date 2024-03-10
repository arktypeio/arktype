import type { ErrorMessage } from "@arktype/util"
import type { TypeNode } from "../../base.js"
import type { writeIndivisibleMessage } from "../../constraints/refinements/divisor.js"
import type { inferAstBase } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> = inferAstBase<
	l,
	$,
	args
> extends infer data
	? [data] extends [number]
		? validateAst<l, $, args>
		: ErrorMessage<writeIndivisibleMessage<TypeNode<data>>>
	: never
