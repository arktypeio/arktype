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
	type Primitive,
	type satisfy,
	type show
} from "@ark/util"
import type { arkPrototypes } from "./keywords/constructors/constructors.ts"
import type { Date } from "./keywords/constructors/Date.ts"
import type { type } from "./keywords/keywords.ts"
import type { DivisibleBy, number } from "./keywords/number/number.ts"
import type { Matching, string } from "./keywords/string/string.ts"
import type { Type } from "./type.ts"
export type { arkPrototypes as object } from "./keywords/constructors/constructors.ts"
export type { number } from "./keywords/number/number.ts"
export type { string } from "./keywords/string/string.ts"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export const attributesKey = noSuggest("attach")

export type attributesKey = typeof attributesKey

export type of<base, attributes> = base & {
	[attributesKey]: {
		base: base
		attributes: attributes
	}
}

export type brand<base, attributes> = base & {
	[attributesKey]: {
		base: base
		attributes: attributes
		brand: true
	}
}

export interface Attributes {
	divisibleBy: number
	moreThan: number
	atLeast: number
	atMost: number
	lessThan: number
	matching: string
	moreThanLength: number
	atLeastLength: number
	atMostLength: number
	lessThanLength: number
	atOrAfter: string
	laterThan: string
	atOrBefore: string
	earlierThan: string
	nominal: string
	optional: true
	default: unknown
}

export declare namespace Attributes {
	export type Kind = keyof Attributes

	export type MetaKind = satisfy<Kind, "optional" | "default">

	export type BaseConstrainingKind = satisfy<Kind, "nominal">

	export type BaseKind = MetaKind | BaseConstrainingKind

	export type ConstrainingKind = Exclude<Kind, MetaKind>

	export type ConditionalKind = Exclude<Kind, BaseKind>

	export type defineAvailable<kind extends ConditionalKind> = BaseKind | kind
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

export type Anonymous = {
	predicate: { "?": 1 }
}

export type Nominal<name> = {
	predicate: constraint<name>
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
> = applyAttribute<t, schemaToConstraint<kind, schema>>

export type applyBrand<t, attribute> = applyAttribute<
	t,
	attribute & { brand: true }
>

export type applyAttribute<t, attribute> =
	t extends InferredMorph<infer i, infer o> ?
		(In: leftIfEqual<i, _applyAttribute<i, attribute>>) => o
	:	leftIfEqual<t, _applyAttribute<t, attribute>>

type _applyAttribute<t, attribute> =
	t extends null | undefined ? t
	: t extends of<infer base, infer attributes> ?
		[number, base] extends [base, number] ?
			"brand" extends keyof attributes | keyof attribute ?
				number.branded.is<attribute & attributes>
			:	number.is<attribute & attributes>
		: [string, base] extends [base, string] ?
			"brand" extends keyof attributes | keyof attribute ?
				string.branded.is<attribute & attributes>
			:	string.is<attribute & attributes>
		: [Date, base] extends [base, Date] ? Date.is<attribute & attributes>
		: of<base, attributes & attribute>
	: [number, t] extends [t, number] ? number.apply<attribute>
	: [string, t] extends [t, string] ?
		"brand" extends keyof attribute ?
			string.branded.apply<attribute>
		:	string.apply<attribute>
	: [Date, t] extends [t, Date] ? Date.apply<attribute>
	: of<t, attribute>

export type AttributeInferenceBehavior = "brand" | "detachOnInfer"

export type attachAttribute<
	t,
	kind extends Attributes.Kind,
	value extends Attributes[kind],
	behavior extends AttributeInferenceBehavior = "detachOnInfer"
> =
	t extends InferredMorph<infer i, infer o> ?
		(In: leftIfEqual<i, _attachAttribute<i, kind, value, behavior>>) => o
	:	leftIfEqual<t, _attachAttribute<t, kind, value, behavior>>

type _attachAttribute<
	t,
	kind extends Attributes.Kind,
	value extends Attributes[kind],
	behavior extends AttributeInferenceBehavior = "detachOnInfer"
> =
	t extends null | undefined ? t
	: t extends of<infer base, infer attributes> ?
		"brand" extends keyof t[attributesKey] | behavior ?
			base extends number ?
				number.branded.is<attributes & number.createAttribute<kind, value>>
			:	{}
		: base extends number ?
			number.is<attributes & number.createAttribute<kind, value>>
		:	{}
	: behavior extends "brand" ?
		t extends number ?
			number.branded.attach<t, kind, value>
		:	{}
	: t extends number ? number.attach<t, kind, value>
	: {}

export interface BaseAttributes
	extends BaseBrandableAttributes,
		MetaAttributes {}

export interface BaseBrandableAttributes {
	nominal: string
}

export interface MetaAttributes {
	optional: true
	default: unknown
}

export interface LengthAttributes {
	moreThanLength: number
	atLeastLength: number
	atMostLength: number
	lessThanLength: number
}

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
		: Anonymous
	:	never

export type distill<
	t,
	opts extends distill.Options = {}
> = finalizeDistillation<t, _distill<t, opts>>

export declare namespace distill {
	export type Endpoint = "in" | "out" | "out.introspectable"

	export type Options = {
		endpoint?: Endpoint
		attributes?: "preserve" | "brand" | "unbrand"
	}

	export type In<t> = distill<t, { endpoint: "in" }>

	export type Out<t> = distill<t, { endpoint: "out" }>

	export namespace withAttributes {
		export type In<t> = distill<t, { endpoint: "in"; attributes: "preserve" }>

		export type Out<t> = distill<t, { endpoint: "out"; attributes: "preserve" }>

		export namespace introspectable {
			export type Out<t> = distill<
				t,
				{ endpoint: "out.introspectable"; attributes: "preserve" }
			>
		}
	}

	export type brand<t> = distill<t, { attributes: "brand" }>

	export type unbrand<t> = distill<t, { attributes: "unbrand" }>

	export namespace introspectable {
		export type Out<t> = distill<t, { endpoint: "out.introspectable" }>
	}
}

type finalizeDistillation<t, distilled> =
	equals<t, distilled> extends true ? t : distilled

type _distill<t, opts extends distill.Options> =
	// ensure optional keys don't prevent extracting defaults
	t extends undefined ? t
	: [t] extends [anyOrNever] ? t
	: t extends of<infer base, infer attributes> ?
		opts["attributes"] extends "preserve" ?
			applyAttribute<_distill<base, opts>, attributes>
		: opts["attributes"] extends "unbrand" ?
			applyAttribute<_distill<base, opts>, Omit<attributes, "brand">>
		: opts["attributes"] extends "brand" ?
			brand<_distill<base, opts>, attributes>
		: "brand" extends keyof attributes ? brand<_distill<base, opts>, attributes>
		: _distill<base, opts>
	: unknown extends t ? unknown
	: t extends TerminallyInferredObject | Primitive ? t
	: t extends InferredMorph<infer i, infer o> ? distillIo<i, o, opts>
	: t extends array ? distillArray<t, opts>
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

export type inferredOptionalOrDefaultKeyOf<o> =
	| inferredDefaultKeyOf<o>
	| inferredOptionalKeyOf<o>

type inExtends<v, t> =
	[v] extends [anyOrNever] ? false
	: [v] extends [t] ? true
	: [v] extends [InferredMorph<infer i>] ? inExtends<i, t>
	: false

type inferredDefaultKeyOf<o> =
	keyof o extends infer k ?
		k extends keyof o ?
			inExtends<o[k], InferredDefault> extends true ?
				k
			:	never
		:	never
	:	never

type inferredOptionalKeyOf<o> =
	keyof o extends infer k ?
		k extends keyof o ?
			inExtends<o[k], InferredOptional> extends true ?
				k
			:	never
		:	never
	:	never

type distillArray<t extends array, opts extends distill.Options> =
	// fast path for non-tuple arrays with no extra props
	// this also allows TS to infer certain recursive arrays like JSON
	t[number][] extends t ? alignReadonly<_distill<t[number], opts>[], t>
	:	distillNonArraykeys<
			t,
			alignReadonly<_distillArray<[...t], opts, []>, t>,
			opts
		>

type alignReadonly<result extends unknown[], original extends array> =
	original extends unknown[] ? result : Readonly<result>

// re-intersect non-array props for a type like `{ name: string } & string[]`
type distillNonArraykeys<
	originalArray extends array,
	distilledArray,
	opts extends distill.Options
> =
	keyof originalArray extends keyof distilledArray | attributesKey ?
		distilledArray
	:	distilledArray &
			_distill<
				{
					[k in keyof originalArray as k extends (
						| keyof distilledArray
						| (opts["attributes"] extends true ? never : attributesKey)
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
		t extends of<unknown, infer constraints> ?
			applyConstraintSchema<of<narrowed, constraints>, "predicate", any>
		:	applyConstraintSchema<narrowed, "predicate", any>
	:	applyConstraintSchema<t, "predicate", any>

export type constrainWithPredicate<t> =
	t extends of<unknown, infer constraints> ?
		applyConstraintSchema<of<t, constraints>, "predicate", any>
	:	applyConstraintSchema<t, "predicate", any>

export type inferPipes<t, pipes extends Morph[]> =
	pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ?
		inferPipes<
			pipes[0] extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			: inferMorphOut<head> extends infer out ?
				(In: distill.withAttributes.In<t>) => Out<out>
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
	optional: {}
}

export type InferredOptional<t = unknown> = of<t, Optional>

export type Default<v = any> = {
	default: { value: v }
}

export type DefaultFor<t> =
	| (Primitive extends t ? Primitive
	  : t extends Primitive ? t
	  : never)
	| (() => t)

export type InferredDefault<t = unknown, v = any> = of<t, Default<v>>

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
	: l extends of<infer lBase, infer lAttributes> ?
		r extends of<infer rBase, infer rAttributes> ?
			of<_inferIntersection<lBase, rBase, piped>, lAttributes & rAttributes>
		:	of<_inferIntersection<lBase, r, piped>, lAttributes>
	: r extends of<infer rBase, infer rAttributes> ?
		of<_inferIntersection<rBase, l, piped>, rAttributes>
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
