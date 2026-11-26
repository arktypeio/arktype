import type { writeNonStructuralOperandMessage } from "@ark/schema"
import type { Brand, ErrorMessage, typeToString } from "@ark/util"
import type { inferAstRoot } from "./infer.ts"
import type { validateAst } from "./validate.ts"

export type validateKeyof<operandAst, $, args> =
	inferAstRoot<operandAst, $, args> extends infer data ?
		[unbrandKeyofOperand<data>] extends [object] ?
			validateAst<operandAst, $, args>
		:	writeKeyofOperandError<data>
	:	never

export type writeKeyofOperandError<data> = ErrorMessage<
	writeNonStructuralOperandMessage<
		"keyof",
		typeToString<unbrandKeyofOperand<data>>
	>
>

/**
 * A brand intersects what it brands with an object, so a branded string
 * would pass for an object and a branded object would have its brand as a
 * key. keyof reads what was branded, as at runtime
 */
export type unbrandKeyofOperand<t> =
	t extends Brand<infer base, unknown> ? base : t
