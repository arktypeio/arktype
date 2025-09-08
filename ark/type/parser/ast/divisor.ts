import type { writeIndivisibleMessage } from "@ark/schema"
import type { ErrorMessage } from "@ark/util"
import type { InferredMorph } from "../../attributes.ts"
import type { inferAstRoot } from "./infer.ts"
import type { writeConstrainedMorphMessage } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type validateDivisor<l, $, args> =
	inferAstRoot<l, $, args> extends infer data ?
		[data] extends [number] ? validateAst<l, $, args>
		: [data] extends [InferredMorph] ?
			ErrorMessage<writeConstrainedMorphMessage<l>>
		:	ErrorMessage<writeIndivisibleMessage<data>>
	:	never
