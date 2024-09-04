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
	type conform,
	type equals,
	type leftIfEqual,
	type Primitive,
	type show
} from "@ark/util"
import type { inferPipe } from "../intersect.ts"
import type { Type } from "../type.ts"
import type { type } from "./ark.ts"
import type { arkPrototypes } from "./constructors/constructors.ts"
import type { Date } from "./constructors/Date.ts"
import type { DivisibleBy, number } from "./number/number.ts"
import type { Matching, string } from "./string/string.ts"
export type { arkPrototypes as object } from "./constructors/constructors.ts"
export type { number } from "./number/number.ts"
export type { string } from "./string/string.ts"

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

export type constraint<rule> = { [k in rule & PropertyKey]: 1 }

export type Literal<rule> = {
	literal: constraint<rule>
}

export type Narrowed = {
	predicate: { "?": 1 }
}

export type Branded<rule> = {
	predicate: constraint<rule>
}

export type primitiveConstraintKindOf<In> = Extract<
	Constraint.PrimitiveKind,
	constraintKindOf<In>
>

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

export type applyConstraintSchema<
	t,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> =
	t extends MorphAst<infer i, infer o> ?
		(
			In: leftIfEqual<i, applyConstraint<i, schemaToConstraint<kind, schema>>>
		) => o
	:	leftIfEqual<t, applyConstraint<t, schemaToConstraint<kind, schema>>>

export type applyConstraint<t, constraint> =
	parseConstraints<t> extends (
		[infer base, infer constraints extends Constraints]
	) ?
		[number, base] extends [base, number] ? number.is<constraint & constraints>
		: [string, base] extends [base, string] ?
			string.is<constraint & constraints>
		: [Date, base] extends [base, Date] ? Date.is<constraint & constraints>
		: constrain<base, constraints & constraint>
	: [number, t] extends [t, number] ? number.withConstraint<constraint>
	: [string, t] extends [t, string] ? string.withConstraint<constraint>
	: [Date, t] extends [t, Date] ? Date.withConstraint<constraint>
	: constrain<t, conform<constraint, Constraints>>

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

type minLengthSchemaToConstraint<schema, rule> =
	schema extends { exclusive: true } ? MoreThanLength<rule>
	:	AtLeastLength<rule>

type maxLengthSchemaToConstraint<schema, rule> =
	schema extends { exclusive: true } ? LessThanLength<rule> : AtMostLength<rule>

export type schemaToConstraint<
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> =
	normalizePrimitiveConstraintRoot<schema> extends infer rule ?
		kind extends "pattern" ? Matching<rule>
		: kind extends "divisor" ? DivisibleBy<rule>
		: kind extends "min" ? number.minSchemaToConstraint<schema, rule>
		: kind extends "max" ? number.maxSchemaToConstraint<schema, rule>
		: kind extends "minLength" ? minLengthSchemaToConstraint<schema, rule>
		: kind extends "maxLength" ? maxLengthSchemaToConstraint<schema, rule>
		: kind extends "exactLength" ? ExactlyLength<rule>
		: kind extends "after" ? Date.afterSchemaToConstraint<schema, rule>
		: kind extends "before" ? Date.beforeSchemaToConstraint<schema, rule>
		: Narrowed
	:	never

export type distill<
	t,
	opts extends distill.Options = {}
> = finalizeDistillation<t, _distill<t, opts>>

export namespace distill {
	export type Endpoint = "in" | "out" | "out.introspectable"

	export type Options = {
		endpoint?: Endpoint
		branded?: true
	}

	export type In<t> = distill<t, { endpoint: "in" }>

	export type Out<t> = distill<t, { endpoint: "out" }>

	export namespace brandable {
		export type In<t> = distill<t, { endpoint: "in"; branded: true }>

		export type Out<t> = distill<t, { endpoint: "out"; branded: true }>

		export namespace introspectable {
			export type Out<t> = distill<
				t,
				{ endpoint: "out.introspectable"; branded: true }
			>
		}
	}

	export type unbranded<t> = distill<t>

	export namespace introspectable {
		export type Out<t> = distill<t, { endpoint: "out.introspectable" }>
	}
}

type finalizeDistillation<t, distilled> =
	equals<t, distilled> extends true ? t : distilled

export type includesMorphs<t> =
	[
		_distill<t, { endpoint: "in"; branded: true }>,
		_distill<t, { endpoint: "out"; branded: true }>
	] extends (
		[
			_distill<t, { endpoint: "out"; branded: true }>,
			_distill<t, { endpoint: "in"; branded: true }>
		]
	) ?
		false
	:	true

type _distill<t, opts extends distill.Options> =
	// ensure optional keys don't prevent extracting defaults
	t extends undefined ? t
	: [t] extends [anyOrNever] ? t
	: parseConstraints<t> extends (
		[infer base, infer constraints extends Constraints]
	) ?
		opts["branded"] extends true ?
			constrain<_distill<base, opts>, constraints>
		:	_distill<base, opts>
	: t extends TerminallyInferredObjectKind | Primitive ? t
	: unknown extends t ? unknown
	: t extends MorphAst<infer i, infer o> ?
		opts["endpoint"] extends "in" ? _distill<i, opts>
		: opts["endpoint"] extends "out.introspectable" ?
			o extends To<infer validatedOut> ?
				_distill<validatedOut, opts>
			:	unknown
		: opts["endpoint"] extends "out" ? _distill<o[1], opts>
		: _distill<o[1], opts> extends infer r ?
			o extends To ?
				(In: i) => To<r>
			:	(In: i) => Out<r>
		:	never
	: t extends DefaultedAst<infer t> ? _distill<t, opts>
	: t extends array ? distillArray<t, opts, []>
	: // we excluded this from TerminallyInferredObjectKind so that those types could be
	// inferred before checking morphs/defaults, which extend Function
	t extends Function ? t
	: // avoid recursing into classes with private props etc.
	{ [k in keyof t]: t[k] } extends t ?
		opts["endpoint"] extends "in" ?
			show<
				{
					[k in keyof t as k extends optionalInputKeyOf<t> ? never
					:	k]: _distill<t[k], opts>
				} & {
					[k in optionalInputKeyOf<t>]?: _distill<t[k], opts>
				}
			>
		:	show<
				{
					[k in keyof t as k extends metaOptionalKeyOf<t> ? never
					:	k]: _distill<t[k], opts>
				} & {
					[k in keyof t as k extends metaOptionalKeyOf<t> ? k
					:	never]?: _distill<t[k], opts>
				}
			>
	:	t

type optionalInputKeyOf<o> = metaDefaultedKeyOf<o> | metaOptionalKeyOf<o>

type metaDefaultedKeyOf<o> = {
	[k in keyof o]: [o[k]] extends [anyOrNever] ? never
	: o[k] extends DefaultedAst ? k
	: never
}[keyof o]

type metaOptionalKeyOf<o> = {
	[k in keyof o]: [o[k]] extends [anyOrNever] ? never
	: o[k] extends OptionalAst ? k
	: never
}[keyof o]

type distillArray<
	t extends array,
	opts extends distill.Options,
	prefix extends array
> =
	_distillArray<t, opts, prefix> extends infer result ?
		(t extends unknown[] ? result
		:	// if the original array was readonly, ensure the distilled array is as well
			Readonly<t>) & // re-intersect non-array props for a type like `{ name: string } & string[]`
			_distill<
				{
					[k in keyof t as k extends keyof unknown[] ? never : k]: t[k]
				},
				opts
			>
	:	never

type _distillArray<
	t extends array,
	opts extends distill.Options,
	prefix extends array
> =
	t extends readonly [infer head, ...infer tail] ?
		_distillArray<tail, opts, [...prefix, _distill<head, opts>]>
	:	[...prefix, ...distillPostfix<t, opts>]

type distillPostfix<
	t extends array,
	opts extends distill.Options,
	postfix extends array = []
> =
	t extends readonly [...infer init, infer last] ?
		distillPostfix<init, opts, [_distill<last, opts>, ...postfix]>
	:	[...{ [i in keyof t]: _distill<t[i], opts> }, ...postfix]

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| arkPrototypes.instanceOfExcluding<"Array" | "Function">
	| ArkEnv.prototypes

export type inferPredicate<t, predicate> =
	predicate extends (data: any, ...args: any[]) => data is infer narrowed ?
		t extends constrain<unknown, infer constraints> ?
			applyConstraintSchema<constrain<narrowed, constraints>, "predicate", any>
		:	applyConstraintSchema<narrowed, "predicate", any>
	:	applyConstraintSchema<t, "predicate", any>

export type constrainWithPredicate<t> =
	t extends constrain<unknown, infer constraints> ?
		applyConstraintSchema<constrain<t, constraints>, "predicate", any>
	:	applyConstraintSchema<t, "predicate", any>

export type inferPipes<t, pipes extends Morph[]> =
	pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ?
		inferPipes<
			pipes[0] extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			: inferMorphOut<head> extends infer out ?
				(In: distill.brandable.In<t>) => Out<out>
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

export type Optional = {
	optional?: {}
}

export type OptionalAst<t = unknown> = constrain<t, Optional>

export type Default<v = any> = ["=", v]

export type DefaultedAst<t = any, v = any> = (In?: t) => Default<v>

export type termOrType<t> = t | Type<t, any>
