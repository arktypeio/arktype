import type {
	ArkErrors,
	BaseRoot,
	Disjoint,
	JsonSchema,
	MetaSchema,
	Morph,
	PredicateCast,
	Predicate as PredicateFn,
	UndeclaredKeyBehavior
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	Callable,
	ErrorMessage,
	inferred,
	Json,
	unset
} from "@ark/util"
import type { ArkAmbient } from "../config.ts"
import type {
	applyAttribute,
	applyBrand,
	applyConstraintSchema,
	Default,
	DefaultFor,
	distill,
	inferIntersection,
	inferMorphOut,
	inferPipes,
	InferredMorph,
	Optional,
	Out,
	Predicate,
	To
} from "../keywords/inference.ts"
import type { type } from "../keywords/keywords.ts"
import type { Scope } from "../scope.ts"
import type { ArrayType } from "./array.ts"
import type { instantiateType } from "./instantiate.ts"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}>
	extends Callable<(data: unknown) => distill.Out<t> | ArkErrors> {
	[inferred]: t
	t: t
	infer: this["inferOut"]
	inferBrandableIn: distill.brandable.In<t>
	inferBrandableOut: distill.brandable.Out<t>
	inferIntrospectableOut: distill.introspectable.Out<t>
	inferOut: distill.Out<t>
	inferIn: distill.In<t>
	inferredOutIsIntrospectable: t extends InferredMorph<any, infer o> ?
		[o] extends [anyOrNever] ? true
		: o extends To ? true
		: false
	: // special-case unknown here to preserve assignability
	unknown extends t ? boolean
	: true

	json: Json
	toJSON(): Json
	meta: ArkAmbient.meta
	precompilation: string | undefined
	toJsonSchema(): JsonSchema
	description: string
	expression: string
	internal: BaseRoot
	$: Scope<$>

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): this["infer"] | ArkErrors

	brandable(): this

	configure(meta: MetaSchema): this

	describe(description: string): this

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	from(literal: this["inferIn"]): this["infer"]

	as<t = unset>(...args: validateChainedAsArgs<t>): instantiateType<t, $>

	brand<const name extends string, r = applyBrand<t, Predicate<name>>>(
		name: name
	): instantiateType<r, $>

	get in(): instantiateType<this["inferBrandableIn"], $>
	get out(): instantiateType<this["inferIntrospectableOut"], $>

	// inferring r into an alias improves perf and avoids return type inference
	// that can lead to incorrect results. See:
	// https://discord.com/channels/957797212103016458/1285420361415917680/1285545752172429312
	intersect<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<inferIntersection<t, r>, $> | Disjoint

	and<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<inferIntersection<t, r>, $>

	or<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<t | r, $>

	narrow<
		narrowed extends this["infer"] = never,
		r = [narrowed] extends [never] ?
			t extends InferredMorph<infer i, infer o> ?
				o extends To ?
					(In: i) => To<applyConstraintSchema<o[1], "predicate", PredicateFn>>
				:	(In: i) => Out<applyConstraintSchema<o[1], "predicate", PredicateFn>>
			:	applyConstraintSchema<t, "predicate", PredicateFn>
		: t extends InferredMorph<infer i, infer o> ?
			o extends To ?
				(In: i) => To<narrowed>
			:	(In: i) => Out<narrowed>
		:	narrowed
	>(
		predicate:
			| PredicateFn<this["infer"]>
			| PredicateCast<this["infer"], narrowed>
	): instantiateType<r, $>

	satisfying<
		narrowed extends this["inferIn"] = never,
		r = [narrowed] extends [never] ?
			applyConstraintSchema<t, "predicate", PredicateFn>
		: t extends InferredMorph<any, infer o> ? (In: narrowed) => o
		: narrowed
	>(
		predicate:
			| PredicateFn<this["inferIn"]>
			| PredicateCast<this["inferIn"], narrowed>
	): instantiateType<r, $>

	array(): ArrayType<t[], $>

	pipe: ChainedPipes<t, $>

	equals<const def>(def: type.validate<def, $>): boolean

	ifEquals<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<r, $> | undefined

	extends<const def>(other: type.validate<def, $>): boolean

	ifExtends<const def, r = type.infer<def, $>>(
		other: type.validate<def, $>
	): instantiateType<r, $> | undefined

	overlaps<const def>(r: type.validate<def, $>): boolean

	extract<const def, r = type.infer<def, $>>(
		r: type.validate<def, $>
	): instantiateType<Extract<t, r>, $>

	exclude<const def, r = type.infer<def, $>>(
		r: type.validate<def, $>
	): instantiateType<Exclude<t, r>, $>

	distribute<mapOut, reduceOut = mapOut[]>(
		mapBranch: (branch: Type, i: number, branches: array<Type>) => mapOut,
		reduceMapped?: (mappedBranches: mapOut[]) => reduceOut
	): reduceOut

	// inferring r into an alias in the return doesn't
	// work the way it does for the other methods here
	optional<r = applyAttribute<t, Optional>>(): instantiateType<r, $>

	default<
		const value extends this["inferIn"],
		r = applyAttribute<t, Default<value>>
	>(
		value: DefaultFor<value>
	): instantiateType<r, $>

	// deprecate Function methods so they are deprioritized as suggestions

	/** @deprecated */
	apply: Function["apply"]

	/** @deprecated */
	bind: Function["bind"]

	/** @deprecated */
	call: Function["call"]

	/** @deprecated */
	caller: Function

	/** @deprecated */
	length: number

	/** @deprecated */
	name: string

	/** @deprecated */
	prototype: Function["prototype"]

	/** @deprecated */
	arguments: Function["arguments"]

	// TS suggests Symbol to allow builtin symbolic access, so override that as well
	/** @deprecated */
	Symbol: never
}

interface ChainedPipeSignature<t, $> {
	<a extends Morph<distill.Out<t>>, r = instantiateType<inferPipes<t, [a]>, $>>(
		a: a
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferPipes<t, [a, b]>, $>
	>(
		a: a,
		b: b
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferPipes<t, [a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferPipes<t, [a, b, c, d]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): NoInfer<r> extends infer result ? result : never
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f, g]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): NoInfer<r> extends infer result ? result : never
}

export interface ChainedPipes<t, $> extends ChainedPipeSignature<t, $> {
	try: ChainedPipeSignature<t, $>
}

type validateChainedAsArgs<t> =
	[t] extends [unset] ?
		[t] extends [anyOrNever] ?
			[]
		:	[
				ErrorMessage<"as requires an explicit type parameter like myType.as<t>()">
			]
	:	[]

export type { Type as BaseType }
