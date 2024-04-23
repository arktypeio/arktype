import type { Key } from "@arktype/util"

import { RawSchema, type RawSchemaDeclaration } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import { compileErrorContext } from "../shared/implement.js"
import type { TraverseApply } from "../shared/traversal.js"

export abstract class RawBasis<
	d extends RawSchemaDeclaration = RawSchemaDeclaration
> extends RawSchema<d> {
	abstract compiledCondition: string
	abstract compiledNegation: string
	abstract literalKeys: Key[]

	rawKeyOf(): RawSchema {
		return this.$.units(this.literalKeys)
	}

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.errorContext as never)
		}
	}

	errorContext: d["errorContext"] = {
		code: this.kind,
		description: this.description,
		...this.inner
	}

	compiledErrorContext = compileErrorContext(this.errorContext!)

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}
}
