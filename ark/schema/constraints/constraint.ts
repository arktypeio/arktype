import { BaseNode, type ConstraintNode, type NodeSubclass } from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { ConstraintKind, PropKind } from "../shared/implement.js"

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
}

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	readonly impliedSiblings?: ConstraintNode[] | undefined

	get hasOpenIntersection() {
		return this.impl.hasOpenIntersection as d["hasOpenIntersection"]
	}
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>

export abstract class BasePrimitiveConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseConstraint<d, subclass> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly expectedContext: d["expectedContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler) {
		js.compilePrimitive(this as never)
	}
}
