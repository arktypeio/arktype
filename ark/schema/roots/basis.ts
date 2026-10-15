import type { NodeCompiler } from "../shared/compile.ts"
import { compileObjectLiteral } from "../shared/implement.ts"
import type { InternalTraversal } from "../shared/traversal.ts"
import { BaseRoot, type InternalRootDeclaration } from "./root.ts"

export abstract class InternalBasis<
	d extends InternalRootDeclaration = InternalRootDeclaration
> extends BaseRoot<d> {
	abstract override compileCondition(js: NodeCompiler, data: string): string
	declare structure: undefined

	traverseApply(data: d["prerequisite"], ctx: InternalTraversal): void {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNodeContext(this.errorContext as never, data)
	}

	private _errorContext: d["errorContext"] | undefined
	// frozen when created, as a missing value shares it
	get errorContext(): d["errorContext"] {
		return (this._errorContext ??= Object.freeze({
			code: this.kind,
			description: this.description,
			meta: this.meta,
			...this.inner
		}))
	}

	get compiledErrorContext(): string {
		return compileObjectLiteral(this.errorContext!)
	}

	compile(js: NodeCompiler): void {
		js.checkLeaf(this)
	}
}
