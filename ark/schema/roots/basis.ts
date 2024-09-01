import type { NodeCompiler } from "../shared/compile.ts"
import { compileErrorContext } from "../shared/implement.ts"
import type { TraverseApply } from "../shared/traversal.ts"
import { BaseRoot, type InternalRootDeclaration } from "./root.ts"

export abstract class InternalBasis<
	d extends InternalRootDeclaration = InternalRootDeclaration
> extends BaseRoot<d> {
	abstract compiledCondition: string
	abstract compiledNegation: string
	declare structure: undefined

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
		if (js.traversalKind === "Allows") js.return(this.compiledCondition)
		else {
			js.if(this.compiledNegation, () =>
				js.line(`${js.ctx}.error(${this.compiledErrorContext})`)
			)
		}
	}
}
