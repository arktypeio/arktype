import type { writeNonStructuralOperandMessage } from "@ark/schema"
import type { Brand, ErrorMessage, typeToString } from "@ark/util"
import type { InferredMorph } from "../../attributes.ts"
import type { inferAstRoot } from "./infer.ts"
import type { validateAst } from "./validate.ts"

export type validateKeyof<operandAst, $, args> =
	inferAstRoot<operandAst, $, args> extends infer data ?
		isKeyofOperand<data> extends true ?
			validateAst<operandAst, $, args>
		:	writeKeyofOperandError<data>
	:	never

/**
 * An object, read through a brand, no branch of which is a morph, as at
 * runtime, where a morph has no keys and any is unknown
 */
export type isKeyofOperand<data> =
	[data] extends [never] ? true
	: unknown extends data ? false
	: [unbrandKeyofOperand<data>] extends [object] ?
		[Extract<data, InferredMorph>] extends [never] ?
			true
		:	false
	:	false

export type writeKeyofOperandError<data> = ErrorMessage<
	writeNonStructuralOperandMessage<
		"keyof",
		unknown extends data ? "unknown"
		: [unbrandKeyofOperand<data>] extends [object] ?
			typeToString<Extract<data, InferredMorph>>
		:	typeToString<unbrandKeyofOperand<data>>
	>
>

/**
 * A brand intersects what it brands with an object, so a branded string
 * would pass for an object and a branded object would have its brand as a
 * key. keyof reads what was branded, as at runtime
 */
export type unbrandKeyofOperand<t> =
	t extends Brand<infer base, unknown> ? base : t
