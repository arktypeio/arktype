import {
	append,
	appendUnique,
	capitalize,
	isArray,
	throwInternalError,
	throwParseError,
	type array,
	type describe,
	type listable,
	type satisfy
} from "@ark/util"
import type {
	NodeSchema,
	Prerequisite,
	innerAttachedAs,
	nodeOfKind
} from "./kinds.ts"
import { BaseNode } from "./node.ts"
import type { NodeParseContext } from "./parse.ts"
import type { Intersection } from "./roots/intersection.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type { BaseNodeDeclaration } from "./shared/declare.ts"
import { Disjoint } from "./shared/disjoint.ts"
import {
	compileObjectLiteral,
	constraintKeys,
	type ConstraintKind,
	type IntersectionContext,
	type NodeKind,
	type RootKind,
	type StructuralKind,
	type UnknownAttachments,
	type kindLeftOf
} from "./shared/implement.ts"
import {
	intersectNodesRoot,
	intersectOrPipeNodes
} from "./shared/intersections.ts"
import type { JsonSchema } from "./shared/jsonSchema.ts"
import { $ark } from "./shared/registry.ts"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.ts"
import { arkKind } from "./shared/utils.ts"
import type { Structure } from "./structure/structure.ts"

export declare namespace Constraint {
	export interface Declaration extends BaseNodeDeclaration {
		kind: ConstraintKind
	}

	export type ReductionResult = BaseRoot | Disjoint | Intersection.Inner.mutable

	export interface Attachments {
		impliedBasis: BaseRoot | null
		impliedSiblings?: array<BaseConstraint> | null
	}

	export type PrimitiveKind = Exclude<ConstraintKind, StructuralKind>
}

export abstract class BaseConstraint<
	// uses -ignore rather than -expect-error because this is not an error in .d.ts
	/** @ts-ignore allow instantiation assignment to the base type */
	out d extends Constraint.Declaration = Constraint.Declaration
> extends BaseNode<d> {
	declare readonly [arkKind]: "constraint"

	constructor(attachments: UnknownAttachments, $: BaseScope) {
		super(attachments, $)
		// define as a getter to avoid it being enumerable/spreadable
		Object.defineProperty(this, arkKind, {
			value: "constraint",
			enumerable: false
		})
	}

	abstract readonly impliedBasis: BaseRoot | null
	readonly impliedSiblings?: array<BaseConstraint>

	intersect<r extends BaseConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return intersectNodesRoot(this, r, this.$) as never
	}
}

export abstract class InternalPrimitiveConstraint<
	d extends Constraint.Declaration
> extends BaseConstraint<d> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

	abstract reduceJsonSchema(
		base: JsonSchema.Constrainable
	): JsonSchema.ToResult<JsonSchema.Constrainable>

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNodeContext(this.errorContext as never)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") js.return(this.compiledCondition)
		else {
			js.if(this.compiledNegation, () =>
				js.line(`${js.ctx}.errorFromNodeContext(${this.compiledErrorContext})`)
			)
		}
	}

	get errorContext(): d["errorContext"] {
		return {
			code: this.kind,
			description: this.description,
			meta: this.meta,
			...this.inner
		}
	}

	get compiledErrorContext(): string {
		return compileObjectLiteral(this.errorContext!)
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
			const nodes = schema.map(schema => ctx.$.node(kind, schema as never))
			// predicate order must be preserved to ensure inputs are narrowed
			// and checked in the correct order
			if (kind === "predicate") return nodes as never
			return nodes.sort((l, r) => (l.hash < r.hash ? -1 : 1)) as never
		}
		const child = ctx.$.node(kind, schema)
		return (child.hasOpenIntersection() ? [child] : child) as never
	}

type ConstraintGroupKind = satisfy<NodeKind, "intersection" | "structure">

interface ConstraintIntersectionState<
	kind extends ConstraintGroupKind = ConstraintGroupKind
> {
	kind: kind
	baseInner: Record<string, unknown>
	l: BaseConstraint[]
	r: BaseConstraint[]
	roots: BaseRoot[]
	ctx: IntersectionContext
}

export const intersectConstraints = <kind extends ConstraintGroupKind>(
	s: ConstraintIntersectionState<kind>
): nodeOfKind<RootKind | Extract<kind, "structure">> | Disjoint => {
	const head = s.r.shift()
	if (!head) {
		let result: BaseNode | Disjoint =
			s.l.length === 0 && s.kind === "structure" ?
				$ark.intrinsic.unknown.internal
			:	s.ctx.$.node(
					s.kind,
					Object.assign(s.baseInner, unflattenConstraints(s.l)),
					{ prereduced: true }
				)

		for (const root of s.roots) {
			if (result instanceof Disjoint) return result

			result = intersectOrPipeNodes(root, result, s.ctx)!
		}

		return result as never
	}
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectOrPipeNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isRoot()) {
				s.roots.push(result)
				s.l.splice(i)
				return intersectConstraints(s)
			}
			s.l[i] = result as BaseConstraint
			matched = true
		} else if (!s.l.includes(result as never)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
			)
		}
	}
	if (!matched) s.l.push(head)

	if (s.kind === "intersection")
		head.impliedSiblings?.forEach(node => appendUnique(s.r, node))
	return intersectConstraints(s)
}

export const flattenConstraints = (inner: object): BaseConstraint[] => {
	const result = Object.entries(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<BaseConstraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
				// preserve order for predicates
			: l.kind === "predicate" && r.kind === "predicate" ? 0
			: l.hash < r.hash ? -1
			: 1
		)

	return result
}

type FlatIntersectionInner = Intersection.Inner & Structure.Inner

type MutableFlatIntersectionInner = Intersection.Inner.mutable &
	Structure.Inner.mutable

export const unflattenConstraints = (
	constraints: array<BaseConstraint>
): FlatIntersectionInner => {
	const inner: MutableFlatIntersectionInner = {}
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
> = nodeOfKind<l | r | "unit" | "union"> | Disjoint | null

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
): never => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = <
	kind extends ConstraintKind,
	expected extends BaseRoot,
	actual extends BaseRoot
>(
	kind: kind,
	expected: expected,
	actual: actual
): string => {
	const actualDescription =
		actual.hasKind("morph") ? "a morph"
		: actual.isUnknown() ? "unknown"
		: actual.exclude(expected).defaultShortDescription

	return `${capitalize(kind)} operand must be ${
		expected.description
	} (was ${actualDescription})` as never
}

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	actual
> = `${Capitalize<kind>} operand must be ${describe<
	Prerequisite<kind>
>} (was ${describe<Exclude<actual, Prerequisite<kind>>>})`
