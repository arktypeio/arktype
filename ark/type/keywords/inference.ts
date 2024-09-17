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
	type Hkt,
	type intersectArrays,
	type isSafelyMappable,
	type leftIfEqual,
	type objectKindOf,
	type Primitive,
	type show
} from "@ark/util"
import type { Type } from "../type.ts"
import type { arkPrototypes } from "./constructors/constructors.ts"
import type { Date } from "./constructors/Date.ts"
import type { type } from "./keywords.ts"
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
	t extends InferredMorph<infer i, infer o> ?
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
		: equals<t, bigint & { [constrained]: constraints }> extends true ?
			[bigint, constraints]
		: equals<t, symbol & { [constrained]: constraints }> extends true ?
			[symbol, constraints]
		: objectKindOf<t> extends infer kind ?
			kind extends BuiltinTerminalObjectKind ?
				[arkPrototypes.instanceOf<kind>, constraints]
			: // delegate array constraint distillation to distillArray
			kind extends "Array" ? null
			: kind extends undefined ? [Omit<base, constrained>, constraints]
			: [base, constraints]
		:	never
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

export declare namespace distill {
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
	: unknown extends t ? unknown
	: t extends TerminallyInferredObject | Primitive ? t
	: t extends InferredMorph<infer i, infer o> ?
		opts["branded"] extends true ?
			distillIo<i, o, opts>
		:	distillUnbrandedIo<t, i, o, opts>
	: t extends array ? distillArray<t, opts>
	: t extends InferredDefault<infer t> ? _distill<t, opts>
	: // we excluded this from TerminallyInferredObjectKind so that those types could be
	// inferred before checking morphs/defaults, which extend Function
	t extends Function ? t
	: isSafelyMappable<t> extends true ? distillMappable<t, opts>
	: t

type distillMappable<o, opts extends distill.Options> =
	opts["endpoint"] extends "in" ?
		show<
			{
				// this is homomorphic so includes parsed optional keys like "key?": "string"
				[k in keyof o as k extends inferredOptionalOrDefaultKeyOf<o> ? never
				:	k]: _distill<o[k], opts>
			} & {
				[k in inferredOptionalOrDefaultKeyOf<o>]?: _distill<o[k], opts>
			}
		>
	:	show<
			{
				// this is homomorphic so includes parsed optional keys like "key?": "string"
				[k in keyof o as k extends inferredOptionalKeyOf<o> ? never
				:	k]: _distill<o[k], opts>
			} & {
				[k in keyof o as k extends inferredOptionalKeyOf<o> ? k
				:	never]?: _distill<o[k], opts>
			}
		>

// have to jump through a bunch of extra hoops to preserve the named instantiation of
// constrain<base, constraints>. If it degrades to `t & {[constrained]: constraints}`,
// we'll not longer be able to extract the constraints and distill will infinitely recurse.
type distillUnbrandedIo<
	t extends InferredMorph,
	i,
	o extends Out,
	opts extends distill.Options
> =
	t extends (
		InferredMorph<
			constrain<infer constrainedIn, any>,
			Out<constrain<infer constrainedOut, any>>
		>
	) ?
		distillIo<
			constrainedIn,
			o extends To ? To<constrainedOut> : Out<constrainedOut>,
			opts
		>
	: t extends InferredMorph<constrain<infer constrainedIn, any>> ?
		distillIo<constrainedIn, o, opts>
	: t extends InferredMorph<any, Out<constrain<infer constrainedOut, any>>> ?
		distillIo<i, o extends To ? To<constrainedOut> : Out<constrainedOut>, opts>
	:	distillIo<i, o, opts>

type distillIo<i, o extends Out, opts extends distill.Options> =
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

type inferredOptionalOrDefaultKeyOf<o> =
	| inferredDefaultKeyOf<o>
	| inferredOptionalKeyOf<o>

type inferredDefaultKeyOf<o> = keyof {
	[k in keyof o as [o[k]] extends [anyOrNever] ? never
	: o[k] extends InferredDefault ? k
	: never]: never
}
type inferredOptionalKeyOf<o> = keyof {
	[k in keyof o as [o[k]] extends [anyOrNever] ? never
	: o[k] extends InferredOptional ? k
	: never]: never
}

type distillArray<t extends array, opts extends distill.Options> =
	_distillArray<[...t], opts, []> extends infer result ?
		distillNonArraykeys<
			t,
			// preserve readonly of the original array
			t extends unknown[] ? result : Readonly<t>,
			opts
		>
	:	never

// re-intersect non-array props for a type like `{ name: string } & string[]`
type distillNonArraykeys<
	originalArray extends array,
	distilledArray,
	opts extends distill.Options
> =
	keyof originalArray extends keyof distilledArray | constrained ?
		distilledArray
	:	distilledArray &
			_distill<
				{
					[k in keyof originalArray as k extends (
						| keyof distilledArray
						| (opts["branded"] extends true ? never : constrained)
					) ?
						never
					:	k]: originalArray[k]
				},
				opts
			>

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

type BuiltinTerminalObjectKind = Exclude<
	keyof arkPrototypes.instances,
	"Array" | "Function"
>

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObject =
	| arkPrototypes.instanceOf<BuiltinTerminalObjectKind>
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

export type InferredMorph<i = any, o extends Out = Out> = (In: i) => o

export type Optional = {
	optional?: {}
}

export type InferredOptional<t = unknown> = constrain<t, Optional>

export type Default<v = any> = ["=", v]

export type InferredDefault<t = any, v = any> = (In?: t) => Default<v>

export type termOrType<t> = t | Type<t, any>

export type inferIntersection<l, r> = _inferIntersection<l, r, false>

export type inferPipe<l, r> = _inferIntersection<l, r, true>

type _inferIntersection<l, r, piped extends boolean> =
	[l & r] extends [infer t extends anyOrNever] ? t
	: l extends InferredMorph<infer lIn, infer lOut> ?
		r extends InferredMorph<any, infer rOut> ?
			piped extends true ?
				(In: lIn) => rOut
			:	// a commutative intersection between two morphs is a ParseError
				never
		: piped extends true ? (In: lIn) => To<r>
		: (In: _inferIntersection<lIn, r, false>) => lOut
	: r extends InferredMorph<infer rIn, infer rOut> ?
		(In: _inferIntersection<rIn, l, false>) => rOut
	: parseConstraints<l> extends (
		[infer lBase, infer lConstraints extends Constraints]
	) ?
		parseConstraints<r> extends (
			[infer rBase, infer rConstraints extends Constraints]
		) ?
			constrain<
				_inferIntersection<lBase, rBase, piped>,
				lConstraints & rConstraints
			>
		:	constrain<_inferIntersection<lBase, r, piped>, lConstraints>
	: parseConstraints<r> extends (
		[infer rBase, infer rConstraints extends Constraints]
	) ?
		constrain<_inferIntersection<l, rBase, piped>, rConstraints>
	: [l, r] extends [object, object] ?
		// adding this intermediate infer result avoids extra instantiations
		intersectObjects<l, r, piped> extends infer result ?
			result
		:	never
	:	l & r

interface MorphableIntersection<piped extends boolean>
	extends Hkt<[unknown, unknown]> {
	body: _inferIntersection<this[0], this[1], piped>
}

type intersectObjects<l, r, piped extends boolean> =
	l extends array ?
		r extends array ?
			intersectArrays<l, r, MorphableIntersection<piped>>
		:	// for an intersection with exactly one array operand like { name: string } & string[],
			// don't compute the intersection to avoid including prototype props
			l & r
	: r extends array ? l & r
	: show<
			// this looks redundant, but should hit the cache anyways and
			// preserves index signature + optional keys correctly
			{
				[k in keyof l]: k extends keyof r ?
					_inferIntersection<l[k], r[k], piped>
				:	l[k]
			} & {
				[k in keyof r]: k extends keyof l ?
					_inferIntersection<l[k], r[k], piped>
				:	r[k]
			}
		>
