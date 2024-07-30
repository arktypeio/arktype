import type {
	constraintKindOf,
	DefaultableAst,
	MorphAst,
	NodeSchema,
	Out,
	PrimitiveConstraintKind
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	BuiltinObjectKind,
	BuiltinObjects,
	conform,
	equals,
	leftIfEqual,
	Primitive,
	propValueOf,
	show
} from "@ark/util"
import type { platformObjectExports } from "./keywords/platformObjects.js"
import type { typedArrayExports } from "./keywords/typedArray.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type ConstraintSet = Record<PropertyKey, 1>

export type Constraints = Record<string, ConstraintSet>

export declare const constrained: unique symbol

export type constrained = typeof constrained

export type of<base, constraints extends Constraints> = base & {
	[constrained]: constraints
}

export type LimitLiteral = number | DateLiteral

export type normalizeLimit<limit> =
	limit extends DateLiteral<infer source> ? source
	: limit extends number | string ? limit
	: never

type constraint<rule> = { [k in rule & PropertyKey]: 1 }

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

export type Literal<rule> = {
	literal: constraint<rule>
}

export type DivisibleBy<rule> = {
	divisibleBy: constraint<rule>
}

export type Length<rule> = {
	length: constraint<rule>
}

export type Matching<rule> = {
	matching: constraint<rule>
}

export type anonymous = "?"

export type Narrowed = {
	predicate: { [k in anonymous]: 1 }
}

export type primitiveConstraintKindOf<In> = Extract<
	PrimitiveConstraintKind,
	constraintKindOf<In>
>

export namespace number {
	export type atLeast<rule> = of<number, AtLeast<rule>>

	export type moreThan<rule> = of<number, MoreThan<rule>>

	export type atMost<rule> = of<number, AtMost<rule>>

	export type lessThan<rule> = of<number, LessThan<rule>>

	export type divisibleBy<rule> = of<number, DivisibleBy<rule>>

	export type narrowed = of<number, Narrowed>

	export type is<constraints extends Constraints> = of<number, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
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
}

export type AtLeastLength<rule> = {
	atLeastLength: constraint<rule>
}

export type AtMostLength<rule> = {
	atMostLength: constraint<rule>
}

export type MoreThanLength<rule> = {
	moreThanLength: constraint<rule>
}

export type LessThanLength<rule> = {
	lessThanLength: constraint<rule>
}

export type ExactlyLength<rule> = {
	atLeastLength: constraint<rule>
	atMostLength: constraint<rule>
}

export namespace string {
	export type atLeastLength<rule> = of<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = of<string, MoreThanLength<rule>>

	export type atMostLength<rule> = of<string, AtMostLength<rule>>

	export type lessThanLength<rule> = of<string, LessThanLength<rule>>

	export type exactlyLength<rule> = of<string, ExactlyLength<rule>>

	export type matching<rule> = of<string, Matching<rule>>

	export type narrowed = of<string, Narrowed>

	export type is<constraints extends Constraints> = of<string, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "minLength" ?
				schema extends { exclusive: true } ?
					moreThanLength<rule>
				:	atLeastLength<rule>
			: kind extends "maxLength" ?
				schema extends { exclusive: true } ?
					lessThanLength<rule>
				:	atMostLength<rule>
			: kind extends "pattern" ? matching<rule & string>
			: kind extends "exactLength" ? exactlyLength<rule>
			: narrowed
		:	never
}

export type AtOrAfter<rule> = {
	atOrAfter: constraint<rule>
}

export type AtOrBefore<rule> = {
	atOrBefore: constraint<rule>
}

export type After<rule> = {
	after: constraint<rule>
}

export type Before<rule> = {
	before: constraint<rule>
}

export namespace Date {
	export type atOrAfter<rule> = of<Date, AtOrAfter<rule>>

	export type after<rule> = of<Date, After<rule>>

	export type atOrBefore<rule> = of<Date, AtOrBefore<rule>>

	export type before<rule> = of<Date, Before<rule>>

	export type narrowed = of<Date, Narrowed>

	export type literal<rule> = of<Date, Literal<rule>>

	export type is<constraints extends Constraints> = of<Date, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "after" ?
				schema extends { exclusive: true } ?
					after<normalizeLimit<rule>>
				:	atOrAfter<normalizeLimit<rule>>
			: kind extends "before" ?
				schema extends { exclusive: true } ?
					before<normalizeLimit<rule>>
				:	atOrBefore<normalizeLimit<rule>>
			:	narrowed
		:	never
}

export type constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	t extends MorphAst<infer i, infer o> ?
		(In: leftIfEqual<i, _constrain<i, kind, schema>>) => Out<o>
	:	leftIfEqual<t, _constrain<t, kind, schema>>

type _constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	schemaToConstraint<kind, schema> extends infer constraint ?
		parseConstraints<t> extends (
			[infer base, infer constraints extends Constraints]
		) ?
			[number, base] extends [base, number] ?
				number.is<constraint & constraints>
			: [string, base] extends [base, string] ?
				string.is<constraint & constraints>
			: [Date, base] extends [base, Date] ? Date.is<constraint & constraints>
			: of<base, constraints & constraint>
		: [number, t] extends [t, number] ? number.constrain<kind, schema>
		: [string, t] extends [t, string] ? string.constrain<kind, schema>
		: [Date, t] extends [t, Date] ? Date.constrain<kind, schema>
		: of<t, conform<constraint, Constraints>>
	:	never

export type parseConstraints<t> =
	t extends of<infer base, infer constraints> ?
		equals<t, number & { [constrained]: constraints }> extends true ?
			[number, constraints]
		: equals<t, string & { [constrained]: constraints }> extends true ?
			[string, constraints]
		: equals<t, Date & { [constrained]: constraints }> extends true ?
			[Date, constraints]
		:	[base, constraints]
	:	null

export type normalizePrimitiveConstraintRoot<
	schema extends NodeSchema<PrimitiveConstraintKind>
> =
	"rule" extends keyof schema ? conform<schema["rule"], PropertyKey>
	:	conform<schema, PropertyKey>

export type schemaToConstraint<
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	normalizePrimitiveConstraintRoot<schema> extends infer rule ?
		kind extends "pattern" ? Matching<rule>
		: kind extends "divisor" ? DivisibleBy<rule>
		: kind extends "exactLength" ? Length<rule>
		: kind extends "min" ?
			schema extends { exclusive: true } ?
				MoreThan<rule>
			:	AtLeast<rule>
		: kind extends "max" ?
			schema extends { exclusive: true } ?
				LessThan<rule>
			:	AtMost<rule>
		: kind extends "minLength" ?
			schema extends { exclusive: true } ?
				MoreThanLength<rule>
			:	AtLeastLength<rule>
		: kind extends "maxLength" ?
			schema extends { exclusive: true } ?
				LessThanLength<rule>
			:	AtMostLength<rule>
		: kind extends "exactLength" ? ExactlyLength<rule>
		: kind extends "after" ?
			schema extends { exclusive: true } ?
				After<normalizeLimit<rule>>
			:	AtOrAfter<normalizeLimit<rule>>
		: kind extends "before" ?
			schema extends { exclusive: true } ?
				Before<normalizeLimit<rule>>
			:	AtOrBefore<normalizeLimit<rule>>
		:	Narrowed
	:	never

export type distillIn<t> = finalizeDistillation<t, _distill<t, "in", "base">>

export type distillOut<t> = finalizeDistillation<t, _distill<t, "out", "base">>

export type distillConstrainableIn<t> = finalizeDistillation<
	t,
	_distill<t, "in", "constrainable">
>

export type distillConstrainableOut<t> = finalizeDistillation<
	t,
	_distill<t, "out", "constrainable">
>

type finalizeDistillation<t, distilled> =
	equals<t, distilled> extends true ? t : distilled

export type includesMorphs<t> =
	[
		_distill<t, "in", "constrainable">,
		_distill<t, "out", "constrainable">
	] extends (
		[_distill<t, "out", "constrainable">, _distill<t, "in", "constrainable">]
	) ?
		false
	:	true

type _distill<
	t,
	io extends "in" | "out",
	distilledKind extends "base" | "constrainable"
> =
	// ensure optional keys don't prevent extracting defaults
	t extends undefined ? t
	: [t] extends [anyOrNever] ? t
	: parseConstraints<t> extends (
		[infer base, infer constraints extends Constraints]
	) ?
		distilledKind extends "base" ?
			_distill<base, io, distilledKind>
		:	of<_distill<base, io, distilledKind>, constraints>
	: t extends TerminallyInferredObjectKind | Primitive ? t
	: unknown extends t ? unknown
	: t extends MorphAst<infer i, infer o> ?
		io extends "in" ?
			_distill<i, io, distilledKind>
		:	_distill<o, io, distilledKind>
	: t extends DefaultableAst<infer t> ? _distill<t, io, distilledKind>
	: t extends array ? distillArray<t, io, distilledKind, []>
	: // we excluded this from TerminallyInferredObjectKind so that those types could be
	// inferred before checking morphs/defaults, which extend Function
	t extends Function ? t
	: // avoid recursing into classes with private props etc.
	{ [k in keyof t]: t[k] } extends t ?
		io extends "in" ?
			show<
				{
					[k in keyof t as k extends defaultableKeyOf<t> ? never : k]: _distill<
						t[k],
						io,
						distilledKind
					>
				} & {
					[k in defaultableKeyOf<t>]?: _distill<t[k], io, distilledKind>
				}
			>
		:	{
				[k in keyof t]: _distill<t[k], io, distilledKind>
			}
	:	t

export type defaultableKeyOf<t> = {
	[k in keyof t]: [t[k]] extends [anyOrNever] ? never
	: t[k] extends DefaultableAst ? k
	: never
}[keyof t]

type distillArray<
	t extends array,
	io extends "in" | "out",
	constraints extends "base" | "constrainable",
	prefix extends array
> =
	t extends readonly [infer head, ...infer tail] ?
		distillArray<
			tail,
			io,
			constraints,
			[...prefix, _distill<head, io, constraints>]
		>
	:	[...prefix, ...distillPostfix<t, io, constraints>]

type distillPostfix<
	t extends array,
	io extends "in" | "out",
	constraints extends "base" | "constrainable",
	postfix extends array = []
> =
	t extends readonly [...infer init, infer last] ?
		distillPostfix<
			init,
			io,
			constraints,
			[_distill<last, io, constraints>, ...postfix]
		>
	:	[...{ [i in keyof t]: _distill<t[i], io, constraints> }, ...postfix]

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| ArkEnv.preserve
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array" | "Function">]
	| propValueOf<platformObjectExports>
	| propValueOf<typedArrayExports>

export type inferPredicate<t, predicate> =
	predicate extends (data: any, ...args: any[]) => data is infer narrowed ?
		t extends of<unknown, infer constraints> ?
			constrain<of<narrowed, constraints>, "predicate", any>
		:	constrain<narrowed, "predicate", any>
	:	constrain<t, "predicate", any>
