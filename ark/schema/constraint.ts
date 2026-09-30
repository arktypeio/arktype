import {
	capitalize,
	isArray,
	throwParseError,
	type array,
	type describe,
	type listable
} from "@ark/util"
import type { NodeSchema, Prerequisite, innerAttachedAs } from "./kinds.ts"
import { BaseNode } from "./node.ts"
import type { NodeParseContext } from "./parse.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type { BaseNodeDeclaration } from "./shared/declare.ts"
import type { ConstraintKind, StructuralKind } from "./shared/implement.ts"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.ts"
import { arkKind } from "./shared/utils.ts"

export declare namespace Constraint {
	export interface Declaration extends BaseNodeDeclaration {
		kind: ConstraintKind
	}

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
	// a getter, so it is neither enumerable nor spreadable
	get [arkKind](): "constraint" {
		return "constraint"
	}

	abstract readonly impliedBasis: BaseRoot | null
	readonly impliedSiblings?: array<BaseConstraint>
}

export abstract class InternalPrimitiveConstraint<
	d extends Constraint.Declaration
> extends BaseConstraint<d> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx))
			ctx.errorFromNodeContext(this.errorContext as never)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") js.return(this.compiledCondition)
		else {
			js.if(this.compiledNegation, () =>
				js.line(
					`ctx.errorFromNodeContext(${js.errorContext(this.errorContext!)})`
				)
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
