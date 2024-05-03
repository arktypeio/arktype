import type { Key } from "@arktype/util"

import { BaseSchema, type RawSchemaDeclaration } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import { compileErrorContext } from "../shared/implement.js"
import type { TraverseApply } from "../shared/traversal.js"

export abstract class RawBasis<
	d extends RawSchemaDeclaration = RawSchemaDeclaration
> extends BaseSchema<d> {
	abstract compiledCondition: string
	abstract compiledNegation: string
	abstract literalKeys: Key[]

	rawKeyOf(): BaseSchema {
		return this.$.units(this.literalKeys)
	}

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) ctx.error(this.errorContext as never)
	}

	get errorContext(): d["errorContext"] {
		return { code: this.kind, description: this.description, ...this.inner }
	}

	get compiledErrorContext(): string {
		return compileErrorContext(this.errorContext!)
	}

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}
}
