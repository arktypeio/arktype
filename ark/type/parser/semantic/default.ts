import type { ErrorMessage } from "@ark/util"
import type { UnitLiteral } from "../string/shift/operator/default.ts"
import type { inferAstOut, inferTerminal } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDefault<baseAst, unitLiteral extends UnitLiteral, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
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
): string => `Default value at ${key} ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`
