import type {
	ArkErrors,
	BaseRoot,
	Disjoint,
	JsonSchema,
	MetaSchema,
	Morph,
	UndeclaredKeyBehavior
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	Callable,
	ErrorMessage,
	inferred,
	Json,
	Primitive,
	unset
} from "@ark/util"
import type { ArkAmbient } from "../config.ts"
import type {
	applyConstraint,
	Default,
	distill,
	inferIntersection,
	inferMorphOut,
	inferPipes,
	InferredMorph,
	Optional,
	To
} from "../keywords/inference.ts"
import type { type } from "../keywords/keywords.ts"
import type { Scope } from "../scope.ts"
import type { ArrayType } from "./array.ts"
import type { instantiateType } from "./instantiate.ts"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}>
	extends Callable<(data: unknown) => distill.Out<t> | ArkErrors> {
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
	:	true
	[inferred]: t

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

	configure(meta: MetaSchema): this

	describe(description: string): this

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	from(literal: this["inferIn"]): this["infer"]

	as<t = unset>(...args: validateChainedAsArgs<t>): instantiateType<t, $>

	get in(): instantiateType<this["inferBrandableIn"], $>
	get out(): instantiateType<this["inferIntrospectableOut"], $>

	// inferring r into an alias improves perf and avoids return type inference
	// that can lead to incorrect results. See:
	// https://discord.com/channels/957797212103016458/1285420361415917680/1285545752172429312
	intersect<const def>(
		def: type.validate<def, $>
	): type.infer<def, $> extends infer r ?
		instantiateType<inferIntersection<t, r>, $> | Disjoint
	:	never

	and<const def>(
		def: type.validate<def, $>
	): type.infer<def, $> extends infer r ?
		instantiateType<inferIntersection<t, r>, $>
	:	never

	or<const def>(
		def: type.validate<def, $>
	): type.infer<def, $> extends infer r ? instantiateType<t | r, $> : never

	array(): ArrayType<t[], $>

	pipe: ChainedPipes<t, $>

	equals<const def>(def: type.validate<def, $>): boolean

	ifEquals<const def>(
		def: type.validate<def, $>
	): type.infer<def, $> extends infer r ? instantiateType<r, $> | undefined
	:	never

	extends<const def>(other: type.validate<def, $>): boolean

	ifExtends<const def>(
		other: type.validate<def, $>
	): type.infer<def, $> extends infer r ? instantiateType<r, $> | undefined
	:	never

	overlaps<const def>(r: type.validate<def, $>): boolean

	extract<const def>(
		r: type.validate<def, $>
	): type.infer<def, $> extends infer r ? instantiateType<Extract<t, r>, $>
	:	never

	exclude<const def>(
		r: type.validate<def, $>
	): type.infer<def, $> extends infer r ? instantiateType<Exclude<t, r>, $>
	:	never

	distribute<mapOut, reduceOut = mapOut[]>(
		mapBranch: (branch: Type, i: number, branches: array<Type>) => mapOut,
		reduceMapped?: (mappedBranches: mapOut[]) => reduceOut
	): NoInfer<reduceOut>

	// inferring r into an alias in the return doesn't
	// work the way it does for the other methods here
	optional<r = applyConstraint<t, Optional>>(): instantiateType<r, $>

	default<
		const value extends Extract<this["inferIn"], Primitive>,
		r = applyConstraint<t, Default<value>>
	>(
		value: value
	): NoInfer<instantiateType<r, $>>
	default<
		const value extends this["inferIn"],
		r = applyConstraint<t, Default<value>>
	>(
		value: () => value
	): NoInfer<instantiateType<r, $>>

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
	): NoInfer<r>
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferPipes<t, [a, b]>, $>
	>(
		a: a,
		b: b
	): NoInfer<r>
	<
		a extends Morph<distill.Out<t>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferPipes<t, [a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): NoInfer<r>
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
	): NoInfer<r>
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
	): NoInfer<r>
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
	): NoInfer<r>
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
	): NoInfer<r>
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
