import { intrinsic } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type {
	Branded,
	constrain,
	constraint,
	Constraints,
	Narrowed,
	Optional
} from "../ast.ts"
import { submodule } from "../utils.ts"
import { epoch } from "./epoch.ts"
import { integer } from "./integer.ts"

export const number: number.module = submodule({
	root: intrinsic.number,
	integer,
	epoch
})

export type AtLeast<rule> = {
	atLeast: constraint<rule>
}

export type AtMost<rule> = {
	atMost: constraint<rule>
}

export type MoreThan<rule> = {
	moreThan: constraint<rule>
}

export type LessThan<rule> = {
	lessThan: constraint<rule>
}

export type DivisibleBy<rule> = {
	divisibleBy: constraint<rule>
}

export declare namespace number {
	export type atLeast<rule> = constrain<number, AtLeast<rule>>

	export type moreThan<rule> = constrain<number, MoreThan<rule>>

	export type atMost<rule> = constrain<number, AtMost<rule>>

	export type lessThan<rule> = constrain<number, LessThan<rule>>

	export type divisibleBy<rule> = constrain<number, DivisibleBy<rule>>

	export type narrowed = constrain<number, Narrowed>

	export type optional = constrain<number, Optional>

	export type branded<rule> = constrain<number, Branded<rule>>

	export type is<constraints extends Constraints> = constrain<
		number,
		constraints
	>

	export type minSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? MoreThan<rule> : AtLeast<rule>

	export type maxSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? LessThan<rule> : AtMost<rule>

	export type withConstraint<constraint> =
		constraint extends MoreThan<infer rule> ? moreThan<rule>
		: constraint extends AtLeast<infer rule> ? atLeast<rule>
		: constraint extends AtMost<infer rule> ? atMost<rule>
		: constraint extends LessThan<infer rule> ? lessThan<rule>
		: constraint extends DivisibleBy<infer rule> ? divisibleBy<rule>
		: constraint extends Optional ? optional
		: constraint extends Narrowed ? narrowed
		: never

	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: number
		epoch: epoch
		integer: integer
	}
}
