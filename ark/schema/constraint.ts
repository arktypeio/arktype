import {
	capitalize,
	isArray,
	throwParseError,
	type array,
	type describeExpression,
	type listable
} from "@arktype/util"
import type {
	MutableInner,
	Node,
	NodeSchema,
	Prerequisite,
	innerAttachedAs
} from "./kinds.js"
import { BaseNode } from "./node.js"
import type { NodeParseContext } from "./parse.js"
import type { BaseRoot, Root, UnknownRoot } from "./roots/root.js"
import type { NodeCompiler } from "./shared/compile.js"
import type { RawNodeDeclaration } from "./shared/declare.js"
import type { Disjoint } from "./shared/disjoint.js"
import {
	compileErrorContext,
	type ConstraintKind,
	type StructuralKind,
	type kindLeftOf
} from "./shared/implement.js"
import { intersectNodesRoot } from "./shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"
import { arkKind } from "./shared/utils.js"

export interface BaseConstraintDeclaration extends RawNodeDeclaration {
	kind: ConstraintKind
}

export abstract class BaseConstraint<
	/** uses -ignore rather than -expect-error because this is not an error in .d.ts
	 * @ts-ignore allow instantiation assignment to the base type */
	out d extends BaseConstraintDeclaration = BaseConstraintDeclaration
> extends BaseNode<d> {
	readonly [arkKind] = "constraint"
	abstract readonly impliedBasis: BaseRoot | null
	readonly impliedSiblings?: array<BaseConstraint>

	intersect<r extends BaseConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return intersectNodesRoot(this, r, this.$) as never
	}
}

export type ConstraintReductionResult =
	| BaseRoot
	| Disjoint
	| MutableInner<"intersection">

export abstract class RawPrimitiveConstraint<
	d extends BaseConstraintDeclaration
> extends BaseConstraint<d> {
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

export const constraintKeyParser =
	<kind extends ConstraintKind>(kind: kind) =>
	(
		schema: listable<NodeSchema<kind>>,
		ctx: NodeParseContext
	): innerAttachedAs<kind> | undefined => {
		if (isArray(schema)) {
			if (schema.length === 0) {
				// Omit empty lists as input
				return
			}
			return schema
				.map(schema => ctx.$.node(kind, schema as never))
				.sort((l, r) => (l.innerHash < r.innerHash ? -1 : 1)) as never
		}
		const child = ctx.$.node(kind, schema)
		return child.hasOpenIntersection() ? [child] : (child as any)
	}

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

export type intersectConstraintKinds<
	l extends ConstraintKind,
	r extends ConstraintKind
> = Node<l | r | "unit" | "union"> | Disjoint | null

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
): never => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = <
	kind extends ConstraintKind,
	expected extends Root,
	actual extends Root
>(
	kind: kind,
	expected: expected,
	actual: actual
): writeInvalidOperandMessage<kind, actual> =>
	`${capitalize(kind)} operand must be ${
		expected.description
	} (was ${actual.exclude(expected).description})` as never

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	actual extends Root
> = `${Capitalize<kind>} operand must be ${describeExpression<
	Prerequisite<kind>
>} (was ${describeExpression<Exclude<actual["infer"], Prerequisite<kind>>>})`

export interface ConstraintAttachments {
	impliedBasis: UnknownRoot | null
	impliedSiblings?: array<BaseConstraint> | null
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, StructuralKind>
