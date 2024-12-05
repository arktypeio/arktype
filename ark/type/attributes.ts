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
	type show
} from "@ark/util"
import type { arkPrototypes } from "./keywords/constructors/constructors.ts"
import type { Date } from "./keywords/constructors/Date.ts"
import type { type } from "./keywords/keywords.ts"
import type { number } from "./keywords/number/number.ts"
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

export const attributesKey = noSuggest("attributes")

export type attributesKey = typeof attributesKey

export type of<base, attributes extends Attributes> = base & {
	[attributesKey]: {
		base: base
		attributes: attributes
	}
}

export type brand<base, attributes extends Attributes> = base & {
	[attributesKey]: {
		base: base
		attributes: attributes
		brand: true
	}
}

export interface ConstrainingAttributeValuesByKind {
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
	after: string
	atOrBefore: string
	before: string
	nominal: string
}

export type ConstrainingAttributeKind = keyof ConstrainingAttributeValuesByKind

export type ConstrainingAttributesByKind = {
	[k in ConstrainingAttributeKind]?: Record<
		ConstrainingAttributeValuesByKind[k],
		true
	>
}

export interface MetaAttributeValuesByKind extends Optional, Default {}

export type MetaAttributeKind = keyof MetaAttributeValuesByKind

export type MetaAttributesByKind = Partial<MetaAttributeValuesByKind>

export interface Attributes
	extends ConstrainingAttributesByKind,
		MetaAttributesByKind {}

export type AttributeKind = keyof Attributes

export type LimitLiteral = number | DateLiteral

export type normalizeLimit<limit> =
	limit extends DateLiteral<infer source> ? source
	: limit extends number | string ? limit
	: never

export type constraint<rule> = { [k in rule & PropertyKey]: true }

export type Anonymous = Nominal<"?">

export type Nominal<name> = {
	nominal: constraint<name>
}

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

export type associateAttributes<
	t,
	attributes extends Attributes
> = attachAttributes<
	t,
	attributes,
	{ behavior: "associate"; endpoint: "in"; replaceExisting: false }
>

export type brandAttributes<
	t,
	attributes extends Attributes
> = attachAttributes<
	t,
	attributes,
	{ behavior: "brand"; endpoint: "in"; replaceExisting: false }
>

export type brandName<t, name extends string> = attachAttributes<
	t,
	Nominal<name>,
	{ behavior: "brand"; endpoint: "out"; replaceExisting: true }
>

type AttachAttributesOptions = {
	behavior: "brand" | "associate"
	endpoint: distill.Endpoint
	replaceExisting: boolean
}

type attachAttributes<
	t,
	attributes extends Attributes,
	opts extends AttachAttributesOptions,
	unmorphedT = Exclude<t, InferredMorph>
> =
	t extends InferredMorph<infer i, infer o> ?
		opts["endpoint"] extends "out" ?
			(In: i) => leftIfEqual<o, _attachAttributes<o, attributes, opts>>
		:	(In: leftIfEqual<i, _attachAttributes<i, attributes, opts>>) => o
	:	leftIfEqual<unmorphedT, _attachAttributes<unmorphedT, attributes, opts>>

type _attachAttributes<
	t,
	attributes extends Attributes,
	opts extends AttachAttributesOptions,
	distributed = t
> =
	distributed extends null | undefined ? distributed
	: [distributed, opts["replaceExisting"]] extends (
		[of<infer base, infer existingAttributes>, false]
	) ?
		"brand" extends (
			keyof distributed[attributesKey & keyof distributed] | opts["behavior"]
		) ?
			brandMultiple<base, existingAttributes & attributes>
		:	associateMultiple<base, existingAttributes & attributes>
	: extractIfSingleAttributeEntry<attributes> extends (
		AttributeEntry<infer kind, infer value>
	) ?
		"brand" extends opts["behavior"] ?
			brandSingle<t, attributes, kind, value>
		:	associateSingle<t, attributes, kind, value>
	: "brand" extends opts["behavior"] ? brandMultiple<t, attributes>
	: associateMultiple<t, attributes>

type associateMultiple<t, attributes extends Attributes> =
	[t, string] extends [string, t] ? string.is<attributes>
	: [t, number] extends [number, t] ? number.is<attributes>
	: [t, Date] extends [Date, t] ? Date.is<attributes>
	: of<t, attributes>

type brandMultiple<t, attributes extends Attributes> =
	[t, string] extends [string, t] ? string.branded.is<attributes>
	: [t, number] extends [number, t] ? number.branded.is<attributes>
	: [t, Date] extends [Date, t] ? Date.branded.is<attributes>
	: brand<t, attributes>

type associateSingle<
	t,
	attributes extends Attributes,
	kind extends AttributeKind,
	value
> =
	[t, string] extends [string, t] ? string.raw.withSingleAttribute<kind, value>
	: [t, number] extends [number, t] ?
		number.raw.withSingleAttribute<kind, value>
	: [t, Date] extends [Date, t] ? Date.raw.withSingleAttribute<kind, value>
	: of<t, attributes>

type brandSingle<
	t,
	attributes extends Attributes,
	kind extends AttributeKind,
	value
> =
	[t, string] extends [string, t] ?
		string.branded.raw.withSingleAttribute<kind, value>
	: [t, number] extends [number, t] ?
		number.branded.raw.withSingleAttribute<kind, value>
	: [t, Date] extends [Date, t] ?
		Date.branded.raw.withSingleAttribute<kind, value>
	:	brand<t, attributes>

type AttributeEntry<kind extends AttributeKind, value> = [kind, value]

/**
 * Check if attributes is a single attribute kind + value that can be collapsed
 * for display purposes, e.g.:
 *
 * // has multiple attribute kinds
 * { divisibleBy: { 2: true }, moreThan: { 3: true } } => null
 *
 * // has multiple attribute values of a single kind
 * { divisibleBy: { 2: true, 3: true } } => null
 *
 * // has a single attribute kind + value, can be collapsed
 * { divisibleBy: { 2: true } } => ["divisibleBy", 2]
 */
type extractIfSingleAttributeEntry<attributes extends Attributes> =
	extractIfSingleEntry<attributes> extends (
		AttributeEntry<infer kind, infer attributesValue>
	) ?
		extractIfSingleEntry<attributesValue> extends [infer key, infer value] ?
			// the relevant values for optional and default aren't
			// stored in keys like constraining attributes
			AttributeEntry<kind, kind extends MetaAttributeKind ? value : key>
		:	null
	:	null

type extractIfSingleEntry<o> = {
	[k in keyof o]: keyof o extends k ? [key: k, value: o[k]] : null
}[keyof o]

export interface LengthAttributeValuesByKind {
	moreThanLength: number
	atLeastLength: number
	atMostLength: number
	lessThanLength: number
}

export type LengthAttributeKind = keyof LengthAttributeValuesByKind

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

export type associateAttributesFromSchema<
	t,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> = associateAttributes<t, schemaToAttributes<kind, schema>>

// useful for helping TypeScript infer that adding attributes to a type
// like string will still be a string for methods like .matching
export type associateAttributesFromStringSchema<
	t extends string,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> = conform<associateAttributes<t, schemaToAttributes<kind, schema>>, string>

export type associateAttributesFromNumberSchema<
	t extends number,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> = conform<associateAttributes<t, schemaToAttributes<kind, schema>>, number>

export type associateAttributesFromDateSchema<
	t extends Date,
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> = conform<associateAttributes<t, schemaToAttributes<kind, schema>>, Date>

export type associateAttributesFromArraySchema<
	t extends readonly unknown[],
	kind extends Constraint.PrimitiveKind,
	schema extends NodeSchema<kind>
> = conform<
	associateAttributes<t, schemaToAttributes<kind, schema>>,
	readonly unknown[]
>

export type schemaToAttributes<
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
			associateAttributes<_distill<base, opts>, attributes>
		: opts["attributes"] extends "unbrand" ?
			associateAttributes<_distill<base, opts>, attributes>
		: opts["attributes"] extends "brand" ?
			brand<_distill<base, opts>, attributes>
		: "brand" extends keyof t[attributesKey] ?
			brand<_distill<base, opts>, attributes>
		:	_distill<base, opts>
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
			"brand" extends keyof t[attributesKey] ?
				brand<narrowed, constraints>
			:	of<narrowed, constraints>
		:	narrowed
	:	associateAttributes<t, Anonymous>

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
	optional: {
		"=": true
	}
}

export type InferredOptional<t = unknown> = of<t, Optional>

export type Default<v = any> = {
	defaultsTo: {
		value: v
	}
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
