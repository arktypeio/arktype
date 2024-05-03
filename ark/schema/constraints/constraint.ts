import { RawNode } from "../node.js"
import type { RawSchema } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { RawNodeDeclaration } from "../shared/declare.js"
import {
	compileErrorContext,
	type ConstraintKind,
	type StructuralKind
} from "../shared/implement.js"
import { intersectNodesRoot } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { arkKind } from "../shared/utils.js"
import type { intersectConstraintKinds } from "./util.js"

export interface BaseConstraintDeclaration extends RawNodeDeclaration {
	kind: ConstraintKind
}

export abstract class RawConstraint<
	/** uses -ignore rather than -expect-error because this is not an error in .d.ts
	 * @ts-ignore allow instantiation assignment to the base type */
	out d extends BaseConstraintDeclaration = BaseConstraintDeclaration
> extends RawNode<d> {
	readonly [arkKind] = "constraint"
	abstract readonly impliedBasis: RawSchema | null
	readonly impliedSiblings?: RawConstraint[] | null

	intersect<r extends RawConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return intersectNodesRoot(this, r, this.$) as never
	}
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, StructuralKind>

export abstract class RawPrimitiveConstraint<
	d extends BaseConstraintDeclaration
> extends RawConstraint<d> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) ctx.error(this.errorContext as never)
	}

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}

	get errorContext(): d["errorContext"] {
		return { code: this.kind, description: this.description, ...this.inner }
	}

	get compiledErrorContext(): string {
		return compileErrorContext(this.errorContext!)
	}
}
