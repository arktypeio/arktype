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
	/**
	 * The top-level generic parameter accepted by the `Type`.\
	 * Potentially includes morphs and subtype constraints not reflected
	 *   in the types fully-inferred input (via `inferIn`) or output (via `infer` or `inferOut`).
	 * @example type A = type.infer<[typeof T.t, '[]']>
	 */
	t: t
	/**
	 * A type representing the output the `Type` will return (after morphs are applied to valid input)
	 * @example export type MyType = typeof MyType.infer
	 * @example export interface MyType extends Identity<typeof MyType.infer> {}
	 */
	infer: this["inferOut"]
	inferBrandableIn: distill.brandable.In<t>
	inferBrandableOut: distill.brandable.Out<t>
	inferIntrospectableOut: distill.introspectable.Out<t>
	inferOut: distill.Out<t>
	/**
	 * A type representing the input the `Type` will accept (before morphs are applied)
	 * @example export type MyTypeInput = typeof MyType.inferIn
	 */
	inferIn: distill.In<t>
	inferredOutIsIntrospectable: t extends InferredMorph<any, infer o> ?
		[o] extends [anyOrNever] ? true
		: o extends To ? true
		: false
	: // special-case unknown here to preserve assignability
	unknown extends t ? boolean
	: true

	/** Internal JSON representation of this `Type` */
	json: Json
	toJSON(): Json
	meta: ArkAmbient.meta
	precompilation: string | undefined
	toJsonSchema(): JsonSchema
	description: string
	expression: string
	internal: BaseRoot
	$: Scope<$>

	/**
	 * Validate data, throwing `type.errors` instance on failure
	 * @returns a valid value
	 * @example const validData = T.assert(rawData)
	 */
	assert(data: unknown): this["infer"]

	/**
	 * Check if data matches the input shape.
	 * Doesn't process any morphs, but does check narrows.
	 * @example type({ foo: "number" }).allows({ foo: "bar" }) // false
	 */
	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): this["infer"] | ArkErrors

	brandable(): this

	configure(meta: MetaSchema): this

	describe(description: string): this

	/**
	 * Create a copy of this `Type` with updated unknown key behavior
	 * - `ignore`: ignore unknown properties (default)
	 * - 'reject': disallow objects with unknown properties
	 * - 'delete': clone the object and keep only known properties
	 */
	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	/**
	 * Create a copy of this `Type` with updated unknown key behavior\
	 * The behavior applies to the whole object tree, not just the immediate properties.
	 * - `ignore`: ignore unknown properties (default)
	 * - 'reject': disallow objects with unknown properties
	 * - 'delete': clone the object and keep only known properties
	 */
	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	/**
	 * Identical to `assert`, but with a typed input as a convenience for providing a typed value.
	 * @example const ConfigT = type({ foo: "string" }); export const config = ConfigT.from({ foo: "bar" })
	 */
	from(literal: this["inferIn"]): this["infer"]

	/**
	 * Cast the way this `Type` is inferred (has no effect at runtime).
	 * const branded = type(/^a/).as<`a${string}`>() // Type<`a${string}`>
	 */
	as<t = unset>(...args: validateChainedAsArgs<t>): instantiateType<t, $>

	// brand<const name extends string, r = applyBrand<t, Predicate<name>>>(
	// 	name: name
	// ): instantiateType<r, $>

	/**
	 * A `Type` representing the deeply-extracted input of the `Type` (before morphs are applied).
	 * @example const inputT = T.in
	 */
	get in(): instantiateType<this["inferBrandableIn"], $>
	/**
	 * A `Type` representing the deeply-extracted output of the `Type` (after morphs are applied).\
	 * **IMPORTANT**: If your type includes morphs, their output will likely be unknown
	 *   unless they were defined with an explicit output validator via `.to(outputType)`, `.pipe(morph, outputType)`, etc.
	 * @example const outputT = T.out
	 */
	get out(): instantiateType<this["inferIntrospectableOut"], $>

	// inferring r into an alias improves perf and avoids return type inference
	// that can lead to incorrect results. See:
	// https://discord.com/channels/957797212103016458/1285420361415917680/1285545752172429312
	/**
	 * Intersect another `Type` definition, returning an introspectable `Disjoint` if the result is unsatisfiable.
	 * @example const intersection = type({ foo: "number" }).intersect({ bar: "string" }) // Type<{ foo: number; bar: string }>
	 * @example const intersection = type({ foo: "number" }).intersect({ foo: "string" }) // Disjoint
	 */
	intersect<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<inferIntersection<t, r>, $> | Disjoint

	/**
	 * Intersect another `Type` definition, throwing an error if the result is unsatisfiable.
	 * @example const intersection = type({ foo: "number" }).intersect({ bar: "string" }) // Type<{ foo: number; bar: string }>
	 */
	and<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<inferIntersection<t, r>, $>

	/**
	 * Union another `Type` definition.\
	 * If the types contain morphs, input shapes should be distinct. Otherwise an error will be thrown.
	 * @example const union = type({ foo: "number" }).or({ foo: "string" }) // Type<{ foo: number } | { foo: string }>
	 * @example const union = type("string.numeric.parse").or("number") // Type<((In: string) => Out<number>) | number>
	 */
	or<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): instantiateType<t | r, $>

	/**
	 * Add a custom predicate to this `Type`.
	 * @example const nan = type('number').narrow(n => Number.isNaN(n)) // Type<number>
	 * @example const foo = type("string").narrow((s): s is `foo${string}` => s.startsWith('foo') || ctx.mustBe('string starting with "foo"')) // Type<"foo${string}">
	 * @example const unique = type('string[]').narrow((a, ctx) => new Set(a).size === a.length || ctx.mustBe('array with unique elements'))
	 */
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

	/**
	 * Create a `Type` for array with elements of this `Type`
	 * @example const T = type(/^foo/); const array = T.array() // Type<string[]>
	 */
	array(): ArrayType<t[], $>

	/**
	 * Morph this `Type` through a chain of morphs.
	 * @example const dedupe = type('string[]').pipe(a => Array.from(new Set(a)))
	 * @example type({codes: 'string.numeric[]'}).pipe(obj => obj.codes).to('string.numeric.parse[]')
	 */
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

	/**
	 * Add a default value for this `Type` when it is used as a property.\
	 * Default value should be a valid input value for this `Type, or a function that returns a valid input value.\
	 * If the type has a morph, it will be applied to the default value.
	 * @example const withDefault = type({ foo: type("string").default("bar") }); withDefault({}) // { foo: "bar" }
	 * @example const withFactory = type({ foo: type("number[]").default(() => [1])) }); withFactory({baz: 'a'}) // { foo: [1], baz: 'a' }
	 * @example const withMorph = type({ foo: type("string.numeric.parse").default("123") }); withMorph({}) // { foo: 123 }
	 */
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
