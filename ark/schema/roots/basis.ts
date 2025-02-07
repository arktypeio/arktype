import type { NodeCompiler } from "../shared/compile.ts"
import { compileObjectLiteral } from "../shared/implement.ts"
import type { TraverseApply } from "../shared/traversal.ts"
import { BaseRoot, type InternalRootDeclaration } from "./root.ts"

export abstract class InternalBasis<
	d extends InternalRootDeclaration = InternalRootDeclaration
> extends BaseRoot<d> {
	abstract compiledCondition: string
	abstract compiledNegation: string
	declare structure: undefined
	shallowMorphs = []

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNodeContext(this.errorContext as never)
	}

	get errorContext(): d["errorContext"] {
		return {
			code: this.kind,
			description: this.description,
			meta: this.meta,
			...this.inner
		}
	}

	get compiledErrorContext(): string {
		return compileObjectLiteral(this.errorContext!)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") js.return(this.compiledCondition)
		else {
			js.if(this.compiledNegation, () =>
				js.line(`${js.ctx}.errorFromNodeContext(${this.compiledErrorContext})`)
			)
		}
	}
}
