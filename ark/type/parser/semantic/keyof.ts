import type { writeNonStructuralOperandMessage } from "@ark/schema"
import type { ErrorMessage, typeToString } from "@ark/util"
import type { inferAstRoot } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateKeyof<operandAst, $, args> =
	inferAstRoot<operandAst, $, args> extends infer data ?
		[data] extends [object] ?
			validateAst<operandAst, $, args>
		:	ErrorMessage<writeNonStructuralOperandMessage<"keyof", typeToString<data>>>
	:	never
