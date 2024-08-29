import { intrinsic, type Constraint, type NodeSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type {
	AtLeast,
	AtMost,
	Branded,
	constrain,
	Constraints,
	DivisibleBy,
	LessThan,
	MoreThan,
	Narrowed,
	normalizePrimitiveConstraintRoot
} from "../ast.ts"
import { submodule } from "../utils.ts"
import { epoch } from "./epoch.ts"
import { integer } from "./integer.ts"

export const number: number.module = submodule({
	$root: intrinsic.number,
	integer,
	epoch
})

export declare namespace number {
	export type atLeast<rule> = constrain<number, AtLeast<rule>>

	export type moreThan<rule> = constrain<number, MoreThan<rule>>

	export type atMost<rule> = constrain<number, AtMost<rule>>

	export type lessThan<rule> = constrain<number, LessThan<rule>>

	export type divisibleBy<rule> = constrain<number, DivisibleBy<rule>>

	export type narrowed = constrain<number, Narrowed>

	export type branded<rule> = constrain<number, Branded<rule>>

	export type is<constraints extends Constraints> = constrain<
		number,
		constraints
	>

	export type parseConstraint<
		kind extends Constraint.PrimitiveKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "min" ?
				schema extends { exclusive: true } ?
					moreThan<rule>
				:	atLeast<rule>
			: kind extends "max" ?
				schema extends { exclusive: true } ?
					lessThan<rule>
				:	atMost<rule>
			: kind extends "divisor" ? divisibleBy<rule>
			: narrowed
		:	never

	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: number
		epoch: epoch
		integer: integer
	}
}
