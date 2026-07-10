import type { writeUnassignableDefaultValueMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { inferDefaultLiteral } from "../shift/operator/default.ts"
import type { inferAstIn } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDefault<baseAst, defaultLiteral extends string, $, args> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
	: [defaultLiteral] extends [never] ?
		// "[]" is narrowed to never by r & UnitLiteral in validate.ts; [] is
		// assignable only to array/tuple input types
		never[] extends inferAstIn<baseAst, $, args> ?
			undefined
		:	ErrorMessage<
				writeUnassignableDefaultValueMessage<astToString<baseAst>, "[]">
			>
	: inferDefaultLiteral<defaultLiteral> extends inferAstIn<baseAst, $, args> ?
		undefined
	:	ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, defaultLiteral>
		>
