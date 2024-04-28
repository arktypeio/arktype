import type { defAttachedAs, innerAttachedAs } from "../../kinds.js"
import type { constraintKindOf } from "../../schemas/intersection.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import {
	implementNode,
	type RefinementKind,
	type StructuralKind
} from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { BaseConstraintNode, constraintKeyParser } from "../constraint.js"

export type RefinementDef<t = any> = BaseMeta & {
	[kind in Extract<constraintKindOf<t>, RefinementKind>]?: defAttachedAs<kind>
}

export type RefinementInner = BaseMeta & {
	[kind in RefinementKind]?: innerAttachedAs<kind>
}

export type RefinementDeclaration = declareNode<{
	kind: "refinement"
	def: RefinementDef
	normalizedDef: RefinementDef
	inner: RefinementInner
	prerequisite: object
	childKind: StructuralKind
}>

export class RefinementNode extends BaseConstraintNode<RefinementDeclaration> {
	impliedBasis = null

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.children.every(prop => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.children.forEach(prop => prop.traverseApply(data as never, ctx))

	compile(js: NodeCompiler): void {
		this.children.forEach(n => {
			js.check(n)
			returnIfFailFast()
		})
		for (let i = 0; i < this.children.length - 1; i++) {
			js.check(this.refinements[i])
			returnIfFailFast()
		}
		js.check(this.refinements.at(-1)!)
		if (this.structure || this.predicate) returnIfFail()
	}
}

export const refinementImplementation = implementNode<RefinementDeclaration>({
	kind: "refinement",
	hasAssociatedError: false,
	normalize: schema => schema,
	keys: {
		divisor: {
			child: true,
			parse: constraintKeyParser("divisor")
		},
		max: {
			child: true,
			parse: constraintKeyParser("max")
		},
		min: {
			child: true,
			parse: constraintKeyParser("min")
		},
		maxLength: {
			child: true,
			parse: constraintKeyParser("maxLength")
		},
		minLength: {
			child: true,
			parse: constraintKeyParser("minLength")
		},
		exactLength: {
			child: true,
			parse: constraintKeyParser("exactLength")
		},
		before: {
			child: true,
			parse: constraintKeyParser("before")
		},
		after: {
			child: true,
			parse: constraintKeyParser("after")
		},
		regex: {
			child: true,
			parse: constraintKeyParser("regex")
		}
	},
	defaults: {
		description: structuralDescription
	},
	intersections: {
		refinement: (l, r) => r
	}
})
