import type { writeUnassignableDefaultValueMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { inferDefaultLiteral } from "../shift/operator/default.ts"
import type { inferAstIn } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDefault<baseAst, defaultLiteral extends string, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
	: // check against the output of the type since morphs will not occur
	//  ambient infer is safe since the default value is always a literal
	inferDefaultLiteral<defaultLiteral> extends inferAstIn<baseAst, $, args> ?
		undefined
	:	ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, defaultLiteral>
		>
