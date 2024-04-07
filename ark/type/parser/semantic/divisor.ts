import type { Schema, writeIndivisibleMessage } from "@arktype/schema"
import type { ErrorMessage } from "@arktype/util"
import type { inferAstIn } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $> = inferAstIn<l, $> extends infer data
	? [data] extends [number]
		? validateAst<l, $>
		: ErrorMessage<writeIndivisibleMessage<Schema<data>>>
	: never
