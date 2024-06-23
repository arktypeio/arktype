import type { ErrorMessage } from "@arktype/util"
import type { UnitLiteral } from "../string/shift/operator/default.js"
import type { inferAstOut, inferTerminal } from "./infer.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateDefault<baseAst, unitLiteral extends UnitLiteral, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
	: // check against the output of the type since morphs will not occur
	inferTerminal<unitLiteral, $, args> extends inferAstOut<baseAst, $, args> ?
		undefined
	:	ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, unitLiteral>
		>

export const writeUnassignableDefaultValueMessage = <
	baseDef extends string,
	unitLiteral extends string
>(
	baseDef: baseDef,
	unitLiteral: unitLiteral
): writeUnassignableDefaultValueMessage<baseDef, unitLiteral> =>
	`${unitLiteral} is not assignable to ${baseDef}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	unitLiteral extends string
> = `${unitLiteral} is not assignable to ${baseDef}`
