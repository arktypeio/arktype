import type {
	ArkError,
	ArkErrors,
	Constraint,
	constraintKindOf,
	Morph,
	NodeSchema
} from "@ark/schema"
import {
	noSuggest,
	type anyOrNever,
	type array,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type conform,
	type equals,
	type leftIfEqual,
	type Primitive,
	type propValueOf,
	type show
} from "@ark/util"
import type { inferPipe } from "./intersect.ts"
import type { type } from "./keywords/ark.ts"
import type { arkPlatform } from "./keywords/platform.ts"
import type { arkTypedArray } from "./keywords/typedArray.ts"
import type { Type } from "./type.ts"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type ConstraintSet = Record<PropertyKey, 1>

export type Constraints = Record<string, ConstraintSet>

export const constrained = noSuggest("arkConstrained")

export type constrained = typeof constrained

export type constrain<base, constraints extends Constraints> = base & {
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
	Constraint.PrimitiveKind,
	constraintKindOf<In>
>

export declare namespace number {
	export type atLeast<rule> = constrain<number, AtLeast<rule>>

	export type moreThan<rule> = constrain<number, MoreThan<rule>>

	export type atMost<rule> = constrain<number, AtMost<rule>>

	export type lessThan<rule> = constrain<number, LessThan<rule>>

	export type divisibleBy<rule> = constrain<number, DivisibleBy<rule>>

	export type narrowed = constrain<number, Narrowed>

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

export declare namespace string {
	export type atLeastLength<rule> = constrain<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = constrain<string, MoreThanLength<rule>>

	export type atMostLength<rule> = constrain<string, AtMostLength<rule>>

	export type lessThanLength<rule> = constrain<string, LessThanLength<rule>>

	export type exactlyLength<rule> = constrain<string, ExactlyLength<rule>>

	export type matching<rule> = constrain<string, Matching<rule>>

	export type narrowed = constrain<string, Narrowed>

	export type is<constraints extends Constraints> = constrain<
		string,
		constraints
	>

	export type parseConstraint<
		kind extends Constraint.PrimitiveKind,
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

export declare namespace Date {
	export type atOrAfter<rule> = constrain<Date, AtOrAfter<rule>>

	export type after<rule> = constrain<Date, After<rule>>

	export type atOrBefore<rule> = constrain<Date, AtOrBefore<rule>>

	export type before<rule> = constrain<Date, Before<rule>>

	export type narrowed = constrain<Date, Narrowed>

	export type literal<rule> = constrain<Date, Literal<rule>>

	export type is<constraints extends Constraints> = constrain<Date, constraints>

	export type parseConstraint<
		kind extends Constraint.PrimitiveKind,
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

export type applyConstraint<
	t,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> =
	t extends MorphAst<infer i, infer o> ?
		(In: leftIfEqual<i, _applyConstraint<i, kind, schema>>) => o
	:	leftIfEqual<t, _applyConstraint<t, kind, schema>>

type _applyConstraint<
	t,
	kind extends Constraint.PrimitiveKind,
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
			: constrain<base, constraints & constraint>
		: [number, t] extends [t, number] ? number.parseConstraint<kind, schema>
		: [string, t] extends [t, string] ? string.parseConstraint<kind, schema>
		: [Date, t] extends [t, Date] ? Date.parseConstraint<kind, schema>
		: constrain<t, conform<constraint, Constraints>>
	:	never

export type parseConstraints<t> =
	t extends constrain<infer base, infer constraints> ?
		equals<t, number & { [constrained]: constraints }> extends true ?
			[number, constraints]
		: equals<t, string & { [constrained]: constraints }> extends true ?
			[string, constraints]
		: equals<t, Date & { [constrained]: constraints }> extends true ?
			[Date, constraints]
		:	[base, constraints]
	:	null

export type normalizePrimitiveConstraintRoot<
	schema extends NodeSchema<Constraint.PrimitiveKind>
> =
	"rule" extends keyof schema ? conform<schema["rule"], PropertyKey>
	:	conform<schema, PropertyKey>

export type schemaToConstraint<
	kind extends Constraint.PrimitiveKind,
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

export type distillValidatedOut<t> = finalizeDistillation<
	t,
	_distill<t, "validatedOut", "constrainable">
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

type IoKind = "in" | "out" | "validatedOut"

type DistilledKind = "base" | "constrainable"

type _distill<t, io extends IoKind, distilledKind extends DistilledKind> =
	// ensure optional keys don't prevent extracting defaults
	t extends undefined ? t
	: [t] extends [anyOrNever] ? t
	: parseConstraints<t> extends (
		[infer base, infer constraints extends Constraints]
	) ?
		distilledKind extends "base" ?
			_distill<base, io, distilledKind>
		:	constrain<_distill<base, io, distilledKind>, constraints>
	: t extends TerminallyInferredObjectKind | Primitive ? t
	: unknown extends t ? unknown
	: t extends MorphAst<infer i, infer o> ?
		io extends "in" ? _distill<i, io, distilledKind>
		: io extends "validatedOut" ?
			o extends To<infer validatedOut> ?
				_distill<validatedOut, io, distilledKind>
			:	unknown
		:	_distill<o[1], io, distilledKind>
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
	io extends IoKind,
	constraints extends DistilledKind,
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
	io extends IoKind,
	constraints extends DistilledKind,
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
	| ArkEnv.prototypes
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array" | "Function">]
	| propValueOf<arkPlatform.keywords>
	| propValueOf<arkTypedArray.submodule>

export type inferPredicate<t, predicate> =
	predicate extends (data: any, ...args: any[]) => data is infer narrowed ?
		t extends constrain<unknown, infer constraints> ?
			applyConstraint<constrain<narrowed, constraints>, "predicate", any>
		:	applyConstraint<narrowed, "predicate", any>
	:	applyConstraint<t, "predicate", any>

export type constrainWithPredicate<t> =
	t extends constrain<unknown, infer constraints> ?
		applyConstraint<constrain<t, constraints>, "predicate", any>
	:	applyConstraint<t, "predicate", any>

export type inferPipes<t, pipes extends Morph[]> =
	pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ?
		inferPipes<
			pipes[0] extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			: inferMorphOut<head> extends infer out ?
				(In: distillConstrainableIn<t>) => Out<out>
			:	never,
			tail
		>
	:	t

export type inferMorphOut<morph extends Morph> = Exclude<
	ReturnType<morph>,
	ArkError | ArkErrors
>

export type Out<o = any> = ["=>", o, boolean]

export type To<o = any> = ["=>", o, true]

export type MorphAst<i = any, o extends Out = Out> = (In: i) => o

export type Default<v = any> = ["=", v]

export type DefaultableAst<t = any, v = any> = (In?: t) => Default<v>

export type termOrType<t> = t | Type<t, any>
