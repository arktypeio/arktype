import {
	type array,
	capitalize,
	type describeExpression,
	throwParseError
} from "@arktype/util"
import type { Prerequisite } from "../kinds.js"
import type { Node } from "../node.js"
import type { Schema, UnknownSchema } from "../schema.js"
import type { RawNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	ConstraintKind,
	NodeAttachments,
	PropKind,
	kindLeftOf
} from "../shared/implement.js"
import type { RawConstraint } from "./constraint.js"

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
	expected extends Schema,
	actual extends Schema
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
	actual extends Schema
> = `${Capitalize<kind>} operand must be ${describeExpression<
	Prerequisite<kind>
>} (was ${describeExpression<actual["infer"]>})`

export interface ConstraintAttachments {
	impliedBasis: UnknownSchema | null
	impliedSiblings?: array<RawConstraint> | null
}

export interface BaseConstraintDeclaration extends RawNodeDeclaration {
	kind: ConstraintKind
	attachments: ConstraintAttachments & NodeAttachments<this>
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>
