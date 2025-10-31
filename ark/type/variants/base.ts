import type {
	BaseNode,
	BaseRoot,
	Disjoint,
	JsonSchema,
	NodeSelector,
	Predicate,
	StandardSchemaV1,
	ToJsonSchema,
	TypeMeta,
	UndeclaredKeyBehavior
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	Callable,
	ErrorMessage,
	inferred,
	JsonStructure,
	unset
} from "@ark/util"
import type {
	defaultFor,
	distill,
	inferIntersection,
	inferPipe,
	InferredMorph,
	Out,
	To
} from "../attributes.ts"
import type { ArkAmbient } from "../config.ts"
import type { type } from "../keywords/keywords.ts"
import type { NaryPipeParser } from "../nary.ts"
import type { Scope } from "../scope.ts"
import type { ArrayType } from "./array.ts"
import type { instantiateType } from "./instantiate.ts"

/** @ts-ignore cast variance */
export interface Inferred<out t = unknown, $ = {}> {
	internal: BaseRoot
	[inferred]: t

	/**
	 * precompiled JS used to optimize validation
	 *
	 * ⚠️ will be `undefined` in [jitless](https://arktype.io/docs/configuration#jitless) mode
	 */
	precompilation: string | undefined

	/**
	 * generic parameter representing this Type
	 *
	 * @typeonly
	 *
	 * ⚠️ May contain types representing morphs or default values that would
	 * be inaccurate if used directly for runtime values. In those cases,
	 * you should use {@link infer} or {@link inferIn} on this object instead.
	 */
	t: t

	/**
	 * #### {@link Scope} in which chained methods are parsed
	 */
	$: Scope<$>

	/**
	 * #### type of output this returns
	 *
	 * @typeonly
	 *
	 * @example
	 * const parseNumber = type("string").pipe(s => Number.parseInt(s))
	 * type ParsedNumber = typeof parseNumber.infer // number
	 */
	infer: this["inferOut"]

	/**
	 * type of output this returns
	 *
	 * 🔗 alias of {@link infer}
	 * @typeonly
	 *
	 *
	 * @example
	 * const parseNumber = type("string").pipe(s => Number.parseInt(s))
	 * type ParsedNumber = typeof parseNumber.infer // number
	 */
	inferOut: distill.Out<t>

	/**
	 * type of output that can be introspected at runtime (e.g. via {@link out})
	 *
	 * ⚠️ If your Type contains morphs, they will be inferred as `unknown` unless
	 * they are an ArkType keyword or have an explicitly defined output validator.
	 *
	 * @typeonly
	 *
	 * @example
	 * const Unmorphed = type("string")
	 * // with no morphs, we can introspect the input and output as a single Type
	 * type UnmorphedOut = typeof Unmorphed.inferIntrospectableOut // string
	 *
	 * const Morphed = type("string").pipe(s => s.length)
	 * // with a standard user-defined morph, TypeScript can infer a
	 * // return type from your function, but we have no way to
	 * // know the shape at runtime
	 * type MorphOut = typeof Morphed.inferIntrospectableOut  // unknown
	 *
	 * const Validated = type("string").pipe(s => s.length).to("number")
	 * // morphs with validated output, including all morph keywords, are introspectable
	 * type ValidatedMorphOut = typeof Validated.inferIntrospectableOut
	 */
	inferIntrospectableOut: distill.introspectable.Out<t>

	/**
	 * #### type of input this allows
	 *
	 * @typeonly
	 *
	 * @example
	 * const parseNumber = type("string").pipe(s => Number.parseInt(s))
	 * type UnparsedNumber = typeof parseNumber.inferIn // string
	 */
	inferIn: distill.In<t>

	/**
	 * #### internal JSON representation
	 */
	json: JsonStructure

	/**
	 * alias of {@link json} for `JSON.stringify` compatibility
	 */
	toJSON(): JsonStructure

	/**
	 * #### generate a JSON Schema
	 *
	 * @throws {ToJsonSchema.Error} if this cannot be converted to JSON Schema
	 */
	toJsonSchema(options?: ToJsonSchema.Options): JsonSchema

	/**
	 * #### metadata like custom descriptions and error messages
	 *
	 * ✅ type {@link https://arktype.io/docs/configuration#custom | can be customized} for your project
	 */
	meta: ArkAmbient.meta

	/**
	 * #### human-readable English description
	 *
	 * ✅ works best for primitive values
	 *
	 * @example
	 * const N = type("0 < number <= 100")
	 * console.log(N.description) // positive and at most 100
	 */
	description: string

	/**
	 * #### syntax string similar to native TypeScript
	 *
	 * ✅ works well for both primitives and structures
	 *
	 * @example
	 * const Loc = type({ coords: ["number", "number"] })
	 * console.log(Loc.expression) // { coords: [number, number] }
	 */
	expression: string

	/**
	 * #### validate and return transformed data or throw
	 *
	 * ✅ sugar to avoid checking for {@link type.errors} if they are unrecoverable
	 *
	 * @example
	 * const CriticalPayload = type({
	 *     superImportantValue: "string"
	 * })
	 * // throws TraversalError: superImportantValue must be a string (was missing)
	 * const data = CriticalPayload.assert({ irrelevantValue: "whoops" })
	 * console.log(data.superImportantValue) // valid output can be accessed directly
	 *
	 * @throws {TraversalError}
	 */
	assert: (data: unknown) => this["infer"]

	/**
	 * #### check input without applying morphs
	 *
	 * ✅ good for stuff like filtering that doesn't benefit from detailed errors
	 *
	 * @example
	 * const Numeric = type("number | bigint")
	 * // [0, 2n]
	 * const numerics = [0, "one", 2n].filter(Numeric.allows)
	 */
	allows: (data: unknown) => data is this["inferIn"]

	/**
	 * #### add metadata to shallow references
	 *
	 * ⚠️ does not affect error messages within properties of an object
	 *
	 * @example
	 * const NotOdd = type("number % 2").configure({ description: "not odd" })
	 * // all constraints at the root are affected
	 * const odd = NotOdd(3) // must be not odd (was 3)
	 * const nonNumber = NotOdd("two") // must be not odd (was "two")
	 *
	 * const NotOddBox = type({
	 *    // we should have referenced notOdd or added meta here
	 *    notOdd: "number % 2",
	 * // but instead chained from the root object
	 * }).configure({ description: "not odd" })
	 * // error message at path notOdd is not affected
	 * const oddProp = NotOddBox({ notOdd: 3 }) // notOdd must be even (was 3)
	 * // error message at root is affected, leading to a misleading description
	 * const nonObject = NotOddBox(null) // must be not odd (was null)
	 */
	configure: NodeSelector.SelectableFn<TypeMeta.MappableInput, this>

	/**
	 * #### add description to shallow references
	 *
	 * 🔗 equivalent to `.configure({ description })` (see {@link configure})
	 * ⚠️ does not affect error messages within properties of an object
	 *
	 * @example
	 * const AToZ = type(/^a.*z$/).describe("a string like 'a...z'")
	 * const good = AToZ("alcatraz") // "alcatraz"
	 * // ArkErrors: must be a string like 'a...z' (was "albatross")
	 * const badPattern = AToZ("albatross")
	 */
	describe: NodeSelector.SelectableFn<string, this>

	/**
	 * #### apply undeclared key behavior
	 *
	 * {@inheritDoc UndeclaredKeyBehavior}
	 */
	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	/**
	 * #### deeply apply undeclared key behavior
	 *
	 * {@inheritDoc UndeclaredKeyBehavior}
	 **/
	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	/**
	 * #### alias for {@link assert} with typed input
	 *
	 * @example
	 * const T = type({ foo: "string" });
	 * // TypeScript: foo must be a string (was 5)
	 * const data = T.from({ foo: 5 });
	 */
	from(literal: this["inferIn"]): this["infer"]

	/**
	 * #### deeply extract inputs
	 *
	 * ✅ will never include morphs
	 * ✅ good for generating JSON Schema or other non-transforming formats
	 *
	 * @example
	 * const User = type({
	 *    age: "string.numeric.parse"
	 * })
	 * // { age: 25 } (age parsed to a number)
	 * const out = User({ age: "25" })
	 * // { age: "25" } (age is still a string)
	 * const inOut = User.in({ age: "25" })
	 */
	get in(): instantiateType<this["inferIn"], $>

	/**
	 * #### deeply extract outputs
	 *
	 * ✅ will never include morphs
	 * ⚠️ if your type includes morphs, their output will likely be unknown unless they
	 * were defined with an explicit output validator via `.to(outputDef)` or `.pipe(morph, outputType)`
	 *
	 * @example
	 * const join = type("string[]").pipe(a => a.join(","))
	 *
	 * const T = type({
	 *    // all keywords have introspectable output
	 *    keyword: "string.numeric.parse",
	 *    // TypeScript knows this returns a string, but we can't introspect that at runtime
	 *    unvalidated: join,
	 *    // if needed, it can be made introspectable with an output validator
	 *    validated: join.to("string")
	 * })
	 *
	 * // Type<{ keyword: number; unvalidated: unknown; validated: string }>
	 * const baseOut = base.out
	 */
	get out(): instantiateType<this["inferIntrospectableOut"], $>

	/**
	 * #### add a compile-time brand to output
	 *
	 * @typenoop
	 *
	 * @example
	 * const Palindrome = type("string")
	 *     .narrow(s => s === [...s].reverse().join(""))
	 *     .brand("palindrome")
	 * // Brand<string, "palindrome">
	 * const out = Palindrome.assert("racecar")
	 */
	brand<const name extends string, r = instantiateType<type.brand<t, name>, $>>(
		name: name
	): r extends infer _ ? _ : never

	/**
	 * #### an array of this
	 *
	 * @example
	 * // Type<{ rebmun: number }[]>
	 * const T = type({ rebmun: "number" }).array();
	 */
	array(): ArrayType<t[], $>

	/**
	 * #### {@link https://arktype.io/docs/objects#properties-optional | optional definition}
	 *
	 * @chainedDefinition
	 *
	 * @example
	 * const Prop = type({ foo: "number" })
	 * // Type<{ bar?: { foo: number } }>
	 * const Obj = type({ bar: Prop.optional() })
	 */
	optional(): [this, "?"]

	/**
	 * #### {@link https://arktype.io/docs/objects#properties-defaultable | defaultable definition}
	 *
	 * ✅ object defaults can be returned from a function
	 * ⚠️ throws if the default value is not allowed
	 * @chainedDefinition
	 *
	 * @example
	 * // Type<{ count: Default<number, 0> }>
	 * const State = type({ count: type.number.default(0) })
	 * const Prop = type({ nested: "boolean" })
	 * const ForObj = type({
	 *     key: Prop.default(() => ({ nested: false }))
	 * })
	 */
	default<const value extends defaultFor<this["inferIn"]>>(
		value: value
	): [this, "=", value]

	/**
	 * #### apply a predicate function to input
	 *
	 * ⚠️ the behavior of {@link narrow}, this method's output counterpart, is usually more desirable
	 * ✅ most useful for morphs with input types that are re-used externally
	 * @predicateCast
	 *
	 * @example
	 * const stringifyUser = type({ name: "string" }).pipe(user => JSON.stringify(user))
	 * const stringifySafe = stringifyUser.filter(user => user.name !== "Bobby Tables")
	 * // Type<(In: `${string}Z`) => To<Date>>
	 * const WithPredicate = type("string.date.parse").filter((s): s is `${string}Z` =>
	 *     s.endsWith("Z")
	 * )
	 */
	filter<
		narrowed extends this["inferIn"] = never,
		r = instantiateType<
			[narrowed] extends [never] ? t
			: t extends InferredMorph<never, infer o> ? (In: narrowed) => o
			: narrowed,
			$
		>
	>(
		predicate: Predicate.Castable<this["inferIn"], narrowed>
	): r extends infer _ ? _ : never

	/**
	 * #### apply a predicate function to output
	 *
	 * ✅ go-to fallback for validation not composable via built-in types and operators
	 * ✅ runs after all other validators and morphs, if present
	 * @predicateCast
	 *
	 * @example
	 * const Palindrome = type("string").narrow(s => s === [...s].reverse().join(""))
	 *
	 * const PalindromicEmail = type("string.date.parse").narrow((date, ctx) =>
	 *		date.getFullYear() === 2025 || ctx.mustBe("the current year")
	 * )
	 * // Type<`${string}.tsx`>
	 * const WithPredicate = type("string").narrow((s): s is `${string}.tsx` => /\.tsx?$/.test(s))
	 */
	narrow<
		narrowed extends this["infer"] = never,
		r = instantiateType<
			[narrowed] extends [never] ? t
			: t extends InferredMorph<infer i, infer o> ?
				o extends To ?
					(In: i) => To<narrowed>
				:	(In: i) => Out<narrowed>
			:	narrowed,
			$
		>
	>(
		predicate: Predicate.Castable<this["infer"], narrowed>
	): r extends infer _ ? _ : never

	/**
	 * #### pipe output through arbitrary transformations or other Types
	 *
	 * @example
	 * const User = type({ name: "string" })
	 *
	 * // parse a string and validate that the result as a user
	 * const parseUser = type("string").pipe(s => JSON.parse(s), user)
	 */
	pipe: ChainedPipeParser<$, t>

	/**
	 * #### parse a definition as an output validator
	 *
	 * 🔗 `to({ name: "string" })` is equivalent to `.pipe(type({ name: "string" }))`
	 *
	 * @example
	 * // parse a string and validate that the result as a user
	 * const parseUser = type("string").pipe(s => JSON.parse(s)).to({ name: "string" })
	 */
	to<const def, r = instantiateType<inferPipe<t, type.infer<def, $>>, $>>(
		def: type.validate<def, $>
	): r extends infer _ ? _ : never

	/**
	 * #### query internal node references
	 *
	 * @experimental filters and returns the Type's internal representation from `@ark/schema`
	 *
	 * @example
	 * // ["blue", "red"]
	 * const values = type("'red' | 'blue'").select("unit").map(u => u.unit)
	 */
	select: BaseNode["select"]
}

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}>
	extends Callable<(data: unknown) => distill.Out<t> | ArkEnv.onFail>,
		Inferred<t, $> {
	/**
	 * #### cast the way this is inferred
	 *
	 * @typenoop
	 *
	 * @example
	 * // Type<`LEEEEEEEE${string}ROY`>
	 * const Leeroy = type(/^LE{8,}ROY$/).as<`LEEEEEEEE${string}ROY`>()
	 */
	as<castTo = unset>(
		...args: validateChainedAsArgs<castTo>
	): instantiateType<castTo, $>

	/**
	 * #### intersect the parsed Type, throwing if the result is unsatisfiable
	 *
	 * @example
	 * // Type<{ foo: number; bar: string }>
	 * const T = type({ foo: "number" }).and({ bar: "string" })
	 * // ParseError: Intersection at foo of number and string results in an unsatisfiable type
	 * const Bad = type({ foo: "number" }).and({ foo: "string" })
	 */
	and<
		const def,
		r = instantiateType<inferIntersection<t, type.infer<def, $>>, $>
	>(
		def: type.validate<def, $>
	): r extends infer _ ? _ : never

	/**
	 * #### union with the parsed Type
	 *
	 * ⚠️ a union that could apply different morphs to the same data is a ParseError ({@link https://arktype.io/docs/expressions#union-morphs | docs})
	 *
	 * @example
	 * // Type<string | { box: string }>
	 * const T = type("string").or({ box: "string" })
	 */
	or<const def, r = instantiateType<t | type.infer<def, $>, $>>(
		def: type.validate<def, $>
	): r extends infer _ ? _ : never

	// inferring r into an alias improves perf and avoids return type inference
	// that can lead to incorrect results. See:
	// https://discord.com/channels/957797212103016458/1285420361415917680/1285545752172429312
	/**
	 * #### intersect the parsed Type, returning an introspectable {@link Disjoint} if the result is unsatisfiable
	 *
	 * @example
	 * // Type<{ foo: number; bar: string }>
	 * const T = type({ foo: "number" }).intersect({ bar: "string" })
	 * const Bad = type("number > 10").intersect("number < 5")
	 * // logs "Intersection of > 10 and < 5 results in an unsatisfiable type"
	 * if (Bad instanceof Disjoint) console.log(`${bad.summary}`)
	 */
	intersect<
		const def,
		r = instantiateType<inferIntersection<t, type.infer<def, $>>, $>
	>(
		def: type.validate<def, $>
	): r extends infer _ ? _ | Disjoint : never

	/**
	 * #### check if the parsed Type's constraints are identical
	 *
	 * ✅ equal types have identical input and output constraints and transforms
	 * @ignoresMeta
	 *
	 * @example
	 * const DivisibleBy6 = type.number.divisibleBy(6).moreThan(0)
	 * // false (left side must also be positive)
	 * DivisibleBy6.equals("number % 6")
	 * // false (right side has an additional <100 constraint)
	 * console.log(DivisibleBy6.equals("0 < (number % 6) < 100"))
	 * const ThirdTry = type("(number % 2) > 0").divisibleBy(3)
	 * // true (types are normalized and reduced)
	 * console.log(DivisibleBy6.equals(ThirdTry))
	 */
	equals<const def>(def: type.validate<def, $>): boolean

	/**
	 * #### narrow this based on an {@link equals} check
	 *
	 * @ignoresMeta
	 *
	 * @example
	 * const N = type.raw(`${Math.random()}`)
	 * // Type<0.5> | undefined
	 * const Ez = N.ifEquals("0.5")
	 */
	ifEquals<const def, r = type.instantiate<def, $>>(
		def: type.validate<def, $>
	): r extends infer _ ? _ | undefined : never

	/**
	 * #### check if this is a subtype of the parsed Type
	 *
	 * ✅ a subtype must include all constraints from the base type
	 * ✅ unlike {@link equals}, additional constraints may be present
	 * @ignoresMeta
	 *
	 * @example
	 * type.string.extends("unknown") // true
	 * type.string.extends(/^a.*z$/) // false
	 */
	extends<const def>(other: type.validate<def, $>): boolean

	/**
	 * #### narrow this based on an {@link extends} check
	 *
	 * @ignoresMeta
	 *
	 * @example
	 * const N = type(Math.random() > 0.5 ? "true" : "0") // Type<0 | true>
	 * const Ez = N.ifExtends("boolean") // Type<true> | undefined
	 */
	ifExtends<const def, r = type.instantiate<def, $>>(
		other: type.validate<def, $>
	): r extends infer _ ? _ | undefined : never

	/**
	 * #### check if a value could satisfy this and the parsed Type
	 *
	 * ⚠️ will return true unless a {@link Disjoint} can be proven
	 *
	 * @example
	 * type.string.overlaps("string | number") // true (e.g. "foo")
	 * type("string | number").overlaps("1") // true (1)
	 * type("number > 0").overlaps("number < 0") // false (no values exist)
	 *
	 * const NoAt = type("string").narrow(s => !s.includes("@"))
	 * NoAt.overlaps("string.email") // true (no values exist, but not provable)
	 */
	overlaps<const def>(r: type.validate<def, $>): boolean

	/**
	 * #### extract branches {@link extend}ing the parsed Type
	 *
	 * @example
	 * // Type<true | 0 | 2>
	 * const T = type("boolean | 0 | 'one' | 2 | bigint").extract("number | 0n | true")
	 */
	extract<
		const def,
		r = instantiateType<t extends type.infer<def, $> ? t : never, $>
	>(
		r: type.validate<def, $>
	): r extends infer _ extends r ? _ : never

	/**
	 * #### exclude branches {@link extend}ing the parsed Type
	 *
	 * @example
	 *
	 * // Type<false | 'one' | bigint>
	 * const T = type("boolean | 0 | 'one' | 2 | bigint").exclude("number | 0n | true")
	 */
	exclude<
		const def,
		r = instantiateType<t extends type.infer<def, $> ? never : t, $>
	>(
		r: type.validate<def, $>
	): r extends infer _ ? _ : never

	/**
	 * @experimental
	 * Map and optionally reduce branches of a union. Types that are not unions
	 * are treated as a single branch.
	 *
	 * @param mapBranch - the mapping function, accepting a branch Type
	 *     Returning another `Type` is common, but any value can be returned and
	 *     inferred as part of the output.
	 *
	 * @param [reduceMapped] - an operation to perform on the mapped branches
	 *     Can be used to e.g. merge an array of returned Types representing
	 *     branches back to a single union.
	 */
	distribute<mapOut, reduceOut = mapOut[]>(
		mapBranch: (branch: Type, i: number, branches: array<Type>) => mapOut,
		reduceMapped?: (mappedBranches: mapOut[]) => reduceOut
	): reduceOut

	/** The Type's [StandardSchema](https://github.com/standard-schema/standard-schema) properties */
	"~standard": StandardSchemaV1.ArkTypeProps<
		NoInfer<this["inferIn"]>,
		NoInfer<this["inferOut"]>
	>

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

	// TS suggests Symbol to allow built-in symbolic access, so override that as well
	/** @deprecated */
	Symbol: never
}

export interface ChainedPipeParser<$, t> extends NaryPipeParser<$, t> {
	try: NaryPipeParser<$, t>
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
