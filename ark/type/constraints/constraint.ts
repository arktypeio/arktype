import {
	capitalize,
	throwParseError,
	type describeExpression
} from "@arktype/util"
import { BaseNode, type ConstraintNode, type Node } from "../base.js"
import type { Prerequisite } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	ConstraintKind,
	PropKind,
	kindLeftOf
} from "../shared/implement.js"
import type { Type } from "../types/type.js"

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
): never => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = <
	kind extends ConstraintKind,
	expected extends Type,
	actual extends Type
>(
	kind: kind,
	expected: expected,
	actual: actual
): writeInvalidOperandMessage<kind, actual> =>
	`${capitalize(kind)} operand must be ${
		expected.description
	} (was ${actual.exclude(expected)})` as never

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	actual extends Type
> = `${Capitalize<kind>} operand must be ${describeExpression<
	Prerequisite<kind>
>} (was ${describeExpression<actual["infer"]>})`

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
}

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration
> extends BaseNode<d["prerequisite"], d> {
	abstract readonly impliedBasis: Type | undefined
	readonly impliedSiblings?: ConstraintNode[] | undefined

	intersect<r extends ConstraintNode>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return this.intersectInternal(r) as never
	}
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>

export abstract class BasePrimitiveConstraint<
	d extends BaseConstraintDeclaration
> extends BaseConstraint<d> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}
}
