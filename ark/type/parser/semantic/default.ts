import type { ErrorMessage, ErrorType } from "@ark/util"
import type { UnitLiteral } from "../string/shift/operator/default.js"
import type { inferAstOut, inferTerminal } from "./infer.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateDefault<baseAst, unitLiteral extends UnitLiteral, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorType ? e
	: // check against the output of the type since morphs will not occur
	inferTerminal<unitLiteral, $, args> extends inferAstOut<baseAst, $, args> ?
		undefined
	:	ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, unitLiteral>
		>

export const writeUnassignableDefaultValueMessage = <
	key extends string,
	message extends string
>(
	key: key,
	message: message
) => `Default value at ${key} ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`
