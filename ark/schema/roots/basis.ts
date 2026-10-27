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
			ctx.errorFromNode(this.errorCtx as never, data)
	}

	private _errorCtx: d["errorCtx"] | undefined
	// frozen when created, as a missing value shares it
	get errorCtx(): d["errorCtx"] {
		return (this._errorCtx ??= Object.freeze({
			code: this.kind,
			description: this.description,
			meta: this.meta,
			...this.inner
		}))
	}

	get jsErrorCtx(): string {
		return compileObjectLiteral(this.errorCtx!)
	}

	compile(js: NodeCompiler): void {
		js.checkLeaf(this)
	}
}
