import type { ArkError, ArkErrors, Morph } from "@ark/schema"
import type {
	anyOrNever,
	array,
	equals,
	Hkt,
	intersectArrays,
	isSafelyMappable,
	Primitive,
	show
} from "@ark/util"
import type { arkPrototypes } from "./keywords/constructors/constructors.ts"
import type { type } from "./keywords/keywords.ts"
import type { Type } from "./type.ts"
export type { arkPrototypes as object } from "./keywords/constructors/constructors.ts"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type LimitLiteral = number | DateLiteral

export type normalizeLimit<limit> =
	limit extends DateLiteral<infer source> ? source
	: limit extends number | string ? limit
	: never

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
	: unknown extends t ? unknown
	: t extends TerminallyInferredObject | Primitive ? t
	: t extends InferredMorph<infer i, infer o> ? distillIo<i, o, opts>
	: t extends array ?
		_distillArray<t, opts> // we excluded this from TerminallyInferredObjectKind so that those types could be
	: // inferred before checking morphs/defaults, which extend Function
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

type _distillArray<t extends array, opts extends distill.Options> =
	t extends unknown[] ? _distillArrayRecurse<t, opts, []>
	:	// preserve readonly from original array
		Readonly<_distillArrayRecurse<t, opts, []>>

type _distillArrayRecurse<
	t extends array,
	opts extends distill.Options,
	prefix extends array
> =
	t extends readonly [infer head, ...infer tail] ?
		_distillArrayRecurse<tail, opts, [...prefix, _distill<head, opts>]>
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
		narrowed
	:	t

export type inferPipes<t, pipes extends Morph[]> =
	pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ?
		inferPipes<
			pipes[0] extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			: inferMorphOut<head> extends infer out ? (In: distill.In<t>) => Out<out>
			: never,
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

export type InferredOptional<t = unknown> = (In?: t) => t

export type Default<v = any> = ["=", v]

export type DefaultFor<t> =
	| (Primitive extends t ? Primitive
	  : t extends Primitive ? t
	  : never)
	| (() => t)

export type InferredDefault<t = unknown, v = any> = (In?: t) => Default<v>

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
