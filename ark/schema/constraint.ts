import {
	append,
	appendUnique,
	capitalize,
	entriesOf,
	isArray,
	throwInternalError,
	throwParseError,
	type Dict,
	type array,
	type describeExpression,
	type listable
} from "@arktype/util"
import type {
	Inner,
	MutableInner,
	Node,
	NodeDef,
	Prerequisite,
	innerAttachedAs
} from "./kinds.js"
import { BaseNode } from "./node.js"
import type { NodeParseContext } from "./parse.js"
import type { IntersectionInner } from "./roots/intersection.js"
import type { BaseRoot, Root, UnknownRoot } from "./roots/root.js"
import type { NodeCompiler } from "./shared/compile.js"
import type { RawNodeDeclaration } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	compileErrorContext,
	constraintKeys,
	type ConstraintKind,
	type IntersectionContext,
	type StructuralKind,
	type kindLeftOf
} from "./shared/implement.js"
import { intersectNodes, intersectNodesRoot } from "./shared/intersections.js"
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
	readonly impliedSiblings?: BaseConstraint[] | null

	intersect<r extends BaseConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return intersectNodesRoot(this, r, this.$) as never
	}
}

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
		def: listable<NodeDef<kind>>,
		ctx: NodeParseContext
	): innerAttachedAs<kind> | undefined => {
		if (isArray(def)) {
			if (def.length === 0) {
				// Omit empty lists as input
				return
			}
			return def
				.map(schema => ctx.$.node(kind, schema as never))
				.sort((l, r) => (l.innerHash < r.innerHash ? -1 : 1)) as never
		}
		const child = ctx.$.node(kind, def)
		return child.hasOpenIntersection() ? [child] : (child as any)
	}

type ConstraintIntersectionState = {
	l: BaseConstraint[]
	r: BaseConstraint[]
	types: BaseRoot[]
	ctx: IntersectionContext
}

export const intersectConstraints = (
	s: ConstraintIntersectionState
): ConstraintIntersectionState | Disjoint => {
	const head = s.r.shift()
	if (!head) return s
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isRoot()) s.types.push(result)
			else s.l[i] = result as BaseConstraint
			matched = true
		} else if (!s.l.includes(result as never)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
			)
		}
	}
	if (!matched) s.l.push(head)

	head.impliedSiblings?.forEach(node => appendUnique(s.r, node))
	return intersectConstraints(s)
}

export const flattenConstraints = (inner: Dict): BaseConstraint[] => {
	const result = entriesOf(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<BaseConstraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
			: l.innerHash < r.innerHash ? -1
			: 1
		)

	return result
}

// TODO: Fix type
export const unflattenConstraints = (
	constraints: array<BaseConstraint>
): IntersectionInner & Inner<"structure"> => {
	const inner: MutableInner<"intersection"> & MutableInner<"structure"> = {}
	for (const constraint of constraints) {
		if (constraint.hasOpenIntersection()) {
			inner[constraint.kind] = append(
				inner[constraint.kind],
				constraint
			) as never
		} else {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
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
