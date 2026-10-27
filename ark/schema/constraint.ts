import {
	arkKind,
	capitalize,
	throwParseError,
	tryParseDate,
	type array,
	type describe,
	type dict
} from "@ark/util"
import type { NodeInput, Prerequisite, nodeOfKind } from "./kinds.ts"
import { BaseNode } from "./node.ts"
import type { Predicate } from "./predicate.ts"
import type { After } from "./refinements/after.ts"
import type { Before } from "./refinements/before.ts"
import type { Divisor } from "./refinements/divisor.ts"
import type { ExactLength } from "./refinements/exactLength.ts"
import type { Max } from "./refinements/max.ts"
import type { MaxLength } from "./refinements/maxLength.ts"
import type { Min } from "./refinements/min.ts"
import type { MinLength } from "./refinements/minLength.ts"
import type { NotEqual } from "./refinements/notEqual.ts"
import type { NotEqualLength } from "./refinements/notEqualLength.ts"
import type { Pattern } from "./refinements/pattern.ts"
import type { Intersection } from "./roots/intersection.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type { BaseNodeDeclaration } from "./shared/declare.ts"
import type { Disjoint } from "./shared/disjoint.ts"
import {
	compileObjectLiteral,
	type ConstraintKind,
	type StructuralKind,
	type kindLeftOf
} from "./shared/implement.ts"
import { sets } from "./shared/sets.ts"
import type { AliasDepth, InternalTraversal } from "./shared/traversal.ts"

export declare namespace Constraint {
	export interface Declaration extends BaseNodeDeclaration {
		kind: ConstraintKind
	}

	export type ReductionResult = BaseRoot | Disjoint | Intersection.Inner.mutable

	export interface Attachments {
		/** the basis it constrains, which an intersection holding it must have */
		implied: BaseRoot | null
		/** the constraints an intersection holding it must also hold */
		impliedBy?: array<BaseConstraint> | null
	}

	export type PrimitiveKind = Exclude<ConstraintKind, StructuralKind>

	export type Schema<kind extends PrimitiveKind = PrimitiveKind> =
		SchemasByKind[kind]

	interface SchemasByKind {
		pattern: Pattern.Schema
		divisor: Divisor.Schema
		exactLength: ExactLength.Schema
		max: Max.Schema
		min: Min.Schema
		maxLength: MaxLength.Schema
		minLength: MinLength.Schema
		before: Before.Schema
		after: After.Schema
		notEqual: NotEqual.Schema
		notEqualLength: NotEqualLength.Schema
		structure: NodeInput<"structure">
		predicate: Predicate.Schema
	}
}

export abstract class BaseConstraint<
	// uses -ignore rather than -expect-error because this is not an error in .d.ts
	/** @ts-ignore allow instantiation assignment to the base type */
	out d extends Constraint.Declaration = Constraint.Declaration
> extends BaseNode<d> {
	// define as a getter to avoid it being enumerable/spreadable
	get [arkKind](): "constraint" {
		return "constraint"
	}

	abstract readonly implied: BaseRoot | null
	declare readonly impliedBy?: array<BaseConstraint>

	intersect<r extends BaseConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return sets().intersect(this, r, this.$) as never
	}
}

export abstract class InternalPrimitiveConstraint<
	d extends Constraint.Declaration
> extends BaseConstraint<d> {
	abstract traverseAllows(
		data: d["prerequisite"],
		ctx: InternalTraversal | AliasDepth
	): boolean
	abstract override compileCondition(js: NodeCompiler, data: string): string

	traverseApply(data: d["prerequisite"], ctx: InternalTraversal): void {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNode(this.errorCtx as never, data)
	}

	compile(js: NodeCompiler): void {
		js.checkLeaf(this)
	}

	/** `errorCtx`, once read */
	private _errorCtx: d["errorCtx"] | undefined
	/** the context of the error it reports when data fails it */
	get errorCtx(): d["errorCtx"] {
		return (this._errorCtx ??= {
			code: this.kind,
			description: this.description,
			meta: this.meta,
			...this.inner
		})
	}

	/** `errorCtx` written as JavaScript, as compiled code reports it */
	get jsErrorCtx(): string {
		return compileObjectLiteral(this.errorCtx!)
	}
}

// the inner of a constraint from what constrain takes, a rule alone or with
// its options, e.g. 5 or { rule: 5, exclusive: true }
export const constraintInputOf = <kind extends Constraint.PrimitiveKind>(
	kind: kind,
	schema: Constraint.Schema<kind>
): NodeInput<kind> => {
	if (typeof schema === "function") return { predicate: schema } as never
	if (schema instanceof RegExp) {
		return (
			schema.flags ?
				{ rule: schema.source, flags: schema.flags }
			:	{ rule: schema.source }) as never
	}
	const { exclusive, ...input } = (
		typeof schema === "object" && !(schema instanceof Date) ?
			schema
		:	{ rule: schema }) as dict & { rule: any }
	if (kind === "after" || kind === "before") {
		const limit =
			typeof input.rule === "string" ?
				tryParseDate(input.rule, true)
			:	new Date(input.rule)
		// an exclusive date limit is the closest inclusive one
		if (exclusive) limit.setTime(limit.valueOf() + (kind === "after" ? 1 : -1))
		return { ...input, rule: limit } as never
	}
	if (kind === "notEqual" && typeof input.rule === "string")
		return { ...input, rule: tryParseDate(input.rule, true) } as never
	if (kind === "pattern" && !input.flags) delete input.flags
	if (!exclusive) return input as never
	return (
		kind === "minLength" ? { ...input, rule: input.rule + 1 }
		: kind === "maxLength" ? { ...input, rule: input.rule - 1 }
		: { ...input, exclusive }) as never
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
		actual.is("morph") ? "a morph"
		: actual.isUnknown() ? "unknown"
		: actual.exclude(expected).brief

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
