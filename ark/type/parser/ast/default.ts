import type { writeUnassignableDefaultValueMessage } from "@ark/schema"
import type { anyOrNever, ErrorMessage } from "@ark/util"
import type {
	applyConstraint,
	Default,
	InferredDefault,
	InferredMorph
} from "../../keywords/inference.ts"
import type { type } from "../../keywords/keywords.ts"
import type { UnitLiteral } from "../shift/operator/default.ts"
import type { inferAstOut } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDefault<baseAst, unitLiteral extends UnitLiteral, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
	: // check against the output of the type since morphs will not occur
	//  ambient infer is safe since the default value is always a literal
	type.infer<unitLiteral> extends inferAstOut<baseAst, $, args> ? undefined
	: ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, unitLiteral>
		>

export type withDefault<t, value> =
	t extends InferredMorph<infer i, infer o> ?
		[t] extends [anyOrNever] ?
			InferredDefault<t, value>
		:	(In: InferredDefault<i, value>) => o
	:	applyConstraint<t, Default<value>>
