import type { writeUnassignableDefaultValueMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { type } from "../../keywords/keywords.ts"
import type { UnitLiteral } from "../string/shift/operator/default.ts"
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
