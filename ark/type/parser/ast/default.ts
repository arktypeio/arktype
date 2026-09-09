import type { writeUnassignableDefaultValueMessage } from "@ark/schema"
import type { EmptyObject, ErrorMessage } from "@ark/util"
import type {
	DefaultLiteral,
	inferDefaultLiteral
} from "../shift/operator/default.ts"
import type { inferAstIn } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDefault<
	baseAst,
	defaultLiteral extends DefaultLiteral,
	$,
	args
> =
	validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e
	: // check against the output of the type since morphs will not occur
	//  ambient infer is safe since the default value is always a literal
	inferDefaultLiteral<defaultLiteral> extends inferAstIn<baseAst, $, args> ?
		undefined
	: defaultLiteral extends "{}" ?
		// "{}" is the "any non-nullish value" type, so it's never directly
		// assignable to an object base even though an empty object is a valid
		// default for one- verify against an EmptyObject, which is assignable
		// exactly to object-like bases, instead
		EmptyObject extends inferAstIn<baseAst, $, args> ?
			undefined
		:	ErrorMessage<
				writeUnassignableDefaultValueMessage<
					astToString<baseAst>,
					defaultLiteral
				>
			>
	:	ErrorMessage<
			writeUnassignableDefaultValueMessage<astToString<baseAst>, defaultLiteral>
		>
