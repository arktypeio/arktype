import {
	capitalize,
	isArray,
	throwParseError,
	type array,
	type describe,
	type listable
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
import type { Disjoint } from "./shared/disjoint.ts"
import {
	compileObjectLiteral,
	type ConstraintKind,
	type StructuralKind,
	type UnknownAttachments,
	type kindLeftOf
} from "./shared/implement.ts"
import type { JsonSchema } from "./shared/jsonSchema.ts"
import { sets } from "./shared/sets.ts"
import type { ToJsonSchema } from "./shared/toJsonSchema.ts"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.ts"
import { arkKind } from "./shared/utils.ts"

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
		return sets("intersect").intersect(this, r, this.$) as never
	}
}

export abstract class InternalPrimitiveConstraint<
	d extends Constraint.Declaration
> extends BaseConstraint<d> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

	abstract reduceJsonSchema(
		base: JsonSchema.Constrainable,
		ctx: ToJsonSchema.Context
	): JsonSchema.Constrainable

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNodeContext(this.errorContext as never)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") js.return(this.compiledCondition)
		else {
			js.if(this.compiledNegation, () =>
				js.line(`ctx.errorFromNodeContext(${this.compiledErrorContext})`)
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
		// If the constraint was reduced to a root node (like unknown for minLength: 0),
		// omit it from the schema since it's trivially satisfied
		if (child.isRoot()) return
		return (child.hasOpenIntersection() ? [child] : child) as never
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
