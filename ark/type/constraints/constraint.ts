import {
	capitalize,
	throwParseError,
	type describeExpression
} from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type ConstraintNode,
	type Node,
	type TypeNode
} from "../base.js"
import type { Prerequisite } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type {
	BaseMeta,
	BaseNodeDeclaration,
	ImplementedAttachments
} from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	ConstraintKind,
	PropKind,
	kindLeftOf,
	nodeImplementationInputOf,
	nodeImplementationOf
} from "../shared/implement.js"

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

export interface PrimitiveConstraintInner<rule = unknown> extends BaseMeta {
	readonly rule: rule
}

type intersectConstraintKinds<
	l extends ConstraintKind,
	r extends ConstraintKind
> = Node<l | r | "unit" | "union"> | Disjoint | null

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
) => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = <
	kind extends ConstraintKind,
	expected extends TypeNode,
	actual extends TypeNode
>(
	kind: kind,
	expected: expected,
	actual: actual
) =>
	`${capitalize(kind)} operand must be ${
		expected.description
	} (was ${actual.exclude(expected)})` as writeInvalidOperandMessage<
		kind,
		actual
	>

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	actual extends TypeNode
> = `${Capitalize<kind>} operand must be ${describeExpression<
	Prerequisite<kind>
>} (was ${describeExpression<actual["infer"]>})`

export interface ConstraintAttachments extends ImplementedAttachments {
	readonly impliedBasis: TypeNode | undefined
}

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
	attachments: ConstraintAttachments
}

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration
> extends BaseNode<d["prerequisite"]> {
	abstract readonly impliedBasis: TypeNode | undefined
	readonly impliedSiblings?: ConstraintNode[] | undefined

	attachTo(node: TypeNode) {
		if (this.impliedBasis && !node.extends(this.impliedBasis)) {
			return throwInvalidOperandError(this.kind, this.impliedBasis, node)
		}
		return node
	}

	intersect<r extends ConstraintNode>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return this.intersectInternal(r) as never
	}
}

export interface PrimitiveConstraintAttachments<
	d extends
		BasePrimitiveConstraintDeclaration = BasePrimitiveConstraintDeclaration
> extends ConstraintAttachments {
	readonly impliedBasis: TypeNode | undefined
	traverseAllows: TraverseAllows<d["prerequisite"]>
	readonly compiledCondition: string
	readonly compiledNegation: string
	readonly errorContext: d["errorContext"]
}

export interface BasePrimitiveConstraintDeclaration
	extends BaseNodeDeclaration {
	attachments: PrimitiveConstraintAttachments
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>

export abstract class BasePrimitiveConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseConstraint<d, subclass> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler) {
		js.compilePrimitive(this as never)
	}
}
