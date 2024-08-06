import type {
	ArkErrors,
	BaseMetaSchema,
	BaseRoot,
	Disjoint,
	Morph,
	UndeclaredKeyBehavior
} from "@ark/schema"
import type { anyOrNever, Callable, ErrorMessage, Json, unset } from "@ark/util"
import type {
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut,
	inferMorphOut,
	inferPipes,
	inferred
} from "../ast.js"
import type { inferIntersection } from "../intersect.js"
import type { Scope } from "../scope.js"
import type { inferTypeRoot, validateTypeRoot } from "../type.js"
import type { ArrayType } from "./array.js"
import type { instantiateType } from "./instantiate.js"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}>
	extends Callable<(data: unknown) => distillOut<t> | ArkErrors> {
	t: t
	tIn: distillConstrainableIn<t>
	tOut: distillConstrainableOut<t>
	infer: distillOut<t>
	inferIn: distillIn<t>
	[inferred]: t

	json: Json
	description: string
	expression: string
	internal: BaseRoot
	$: Scope<$>

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): distillOut<t> | ArkErrors

	configure(meta: BaseMetaSchema | string): this

	describe(description: string): this

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	from(literal: this["inferIn"]): this["infer"]

	as<t = unset>(...args: validateChainedAsArgs<t>): instantiateType<t, $>

	get in(): instantiateType<this["tIn"], $>
	get out(): instantiateType<this["tOut"], $>

	intersect<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<inferIntersection<t, r>, $> | Disjoint

	// these defaulted params are split up to optimize
	// type perf while maintaining accurate inference for test cases
	// like "nested 'and' chained from morph on optional"
	and<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<inferIntersection<t, r>, $>

	or<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<t | r, $>

	array(): ArrayType<t[], $>

	pipe<
		a extends Morph<this["infer"]>,
		r = instantiateType<inferPipes<t, [a]>, $>
	>(
		a: a
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferPipes<t, [a, b]>, $>
	>(
		a: a,
		b: b
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferPipes<t, [a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferPipes<t, [a, b, c, d]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d
	): r
	pipe<
		a extends Morph<this["infer"]>,
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
	): r
	pipe<
		a extends Morph<this["infer"]>,
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
	): r
	pipe<
		a extends Morph<this["infer"]>,
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
	): r

	equals<def>(
		def: validateTypeRoot<def, $>
	): this is instantiateType<inferTypeRoot<def, $>, $>

	extract<def>(
		r: validateTypeRoot<def, $>
	): instantiateType<Extract<t, inferTypeRoot<def, $>>, $>

	exclude<def>(
		r: validateTypeRoot<def, $>
	): instantiateType<Exclude<t, inferTypeRoot<def, $>>, $>

	extends<def>(
		other: validateTypeRoot<def, $>
	): this is instantiateType<inferTypeRoot<def, $>, $>

	overlaps<def>(r: validateTypeRoot<def, $>): boolean

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

type validateChainedAsArgs<t> =
	[t] extends [unset] ?
		[t] extends [anyOrNever] ?
			[]
		:	[
				ErrorMessage<"as requires an explicit type parameter like myType.as<t>()">
			]
	:	[]

export type { Type as BaseType }
