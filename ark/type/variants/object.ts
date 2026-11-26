import type {
	ArkEnv,
	BaseMappedPropInner,
	OptionalMappedPropInner,
	Prop
} from "@ark/schema"
import type {
	anyOrNever,
	arkGet,
	arkIndexableOf,
	arkKeyOf,
	array,
	brand,
	exactEquals,
	ErrorType,
	inferred,
	intersectUnion,
	JsonStructure,
	Key,
	listable,
	merge,
	optionalKeyOf,
	show,
	toArkKey
} from "@ark/util"
import type {
	Default,
	InferredMorph,
	isInferredDefault,
	required,
	TerminallyInferredObject,
	withDefault,
	withoutDefault
} from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { inferDefinition } from "../parser/definition.ts"
import type { ArrayType } from "./array.ts"
import type { BaseType } from "./base.ts"
import type { instantiateType } from "./instantiate.ts"

/** @ts-ignore cast variance */
interface Type<out t extends object = object, in out $ = {}>
	extends BaseType<t, $> {
	readonly(): t extends array ? ArrayType<{ readonly [i in keyof t]: t[i] }, $>
	:	Type<
			exactEquals<t, object> extends true ? object
			:	{ readonly [k in keyof t]: t[k] },
			$
		>

	keyof(): instantiateType<
		exactEquals<t, object> extends true ? Key : arkKeyOf<t>,
		$
	>

	/**
	 * #### the Type at a key, or at a path of up to three keys
	 *
	 * @example
	 * const User = type({ name: "string", address: { city: "string" } })
	 * // Type<string>
	 * const City = User.get("address", "city")
	 */
	get<const k1 extends arkIndexableOf<t>, r = instantiateType<gotAt<t, k1>, $>>(
		k1: k1 | type.cast<k1>
	): r extends infer _ ? _ : never
	get<
		const k1 extends arkIndexableOf<t>,
		const k2 extends arkIndexableOf<definedAt<t, k1>>,
		r = instantiateType<gotAt<definedAt<t, k1>, k2> | undefinedAt<t, k1>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): r extends infer _ ? _ : never
	get<
		const k1 extends arkIndexableOf<t>,
		const k2 extends arkIndexableOf<definedAt<t, k1>>,
		const k3 extends arkIndexableOf<definedAt<definedAt<t, k1>, k2>>,
		r = instantiateType<
			| gotAt<definedAt<definedAt<t, k1>, k2>, k3>
			| undefinedAt<definedAt<t, k1>, k2>
			| undefinedAt<t, k1>,
			$
		>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): r extends infer _ ? _ : never

	/**
	 * #### copy with only the given keys
	 *
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 *
	 * @example
	 * const User = type({ id: "string", name: "string", email: "string.email" })
	 * // Type<{ name: string; email: string }>
	 * const Contact = User.pick("name", "email")
	 */
	pick<const key extends arkKeyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Extract<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	/**
	 * #### copy without the given keys
	 *
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 *
	 * @example
	 * const User = type({ id: "string", name: "string", email: "string.email" })
	 * // Type<{ name: string; email: string }>
	 * const NewUser = User.omit("id")
	 */
	omit<const key extends arkKeyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	/**
	 * #### copy with another object's keys, its value winning where both have one
	 *
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 *
	 * @example
	 * const Member = type({ name: "string", role: "'guest' | 'member'" })
	 * // Type<{ name: string; role: "admin"; since: Date }>
	 * const Admin = Member.merge({ role: "'admin'", since: "Date" })
	 */
	merge<
		const def,
		inferredDef = inferDefinition<def, $>,
		r = Type<merge<t, inferredDef>, $>
	>(
		def: type.validate<def, $> &
			// if you can figure out a way to avoid inlining this without
			// breaking autocomplete and validation, do it! checking inferredDef
			// instead fails to infer def from a call like .describe() within it
			(inferDefinition<def, $> extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredDef]>)
	): r extends infer _ ? _ : never

	/**
	 * #### copy with every key (or only the given keys) required
	 *
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 * 🔗 like TS's `Required`, an array or tuple base is preserved and
	 * applied to its elements, e.g. `type(["string", "number"]).required()`
	 *
	 * @example
	 * const Draft = type({ "title?": "string", "body?": "string" })
	 * // Type<{ title: string; body: string }>
	 * const Post = Draft.required()
	 * // Type<{ title: string; body?: string }>
	 * const Titled = Draft.required("title")
	 */
	required(): instantiateType<
		exactEquals<t, object> extends true ? object : show<required<t>>,
		$
	>
	required<const key extends selectiveKeyOf<t>>(
		...keys: [key | type.cast<key>, ...(key | type.cast<key>)[]]
	): Type<selectiveRequired<t, key>, $>

	/**
	 * #### copy with every key (or only the given keys) optional
	 *
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 * 🔗 like TS's `Partial`, an array or tuple base is preserved and
	 * applied to its elements, e.g. `type(["string", "number"]).partial()`
	 *
	 * @example
	 * const User = type({ name: "string", email: "string.email" })
	 * // Type<{ name?: string; email?: string }>
	 * const UserPatch = User.partial()
	 * // Type<{ name: string; email?: string }>
	 * const OptionalEmail = User.partial("email")
	 */
	partial(): instantiateType<
		exactEquals<t, object> extends true ? object : { [k in keyof t]?: t[k] },
		$
	>
	partial<const key extends selectiveKeyOf<t>>(
		...keys: [key | type.cast<key>, ...(key | type.cast<key>)[]]
	): Type<selectivePartial<t, key>, $>

	/**
	 * #### copy with each property transformed by a function
	 *
	 * ✅ return `[]` to remove a property, or an array to replace it with several
	 * ⚠️ returns a new object built from the properties it extracts, so a root
	 * narrow, filter or metadata on this `Type` is not carried over
	 * ({@link https://arktype.io/docs/objects#properties-structural | docs})
	 *
	 * @example
	 * const User = type({ name: "string", email: "string.email" })
	 * // Type<{ name: string | null; email: string | null }>
	 * const Nullable = User.map(prop => ({ key: prop.key, value: prop.value.or("null") }))
	 */
	map<
		transformed extends listable<MappedTypeProp>,
		r = Type<mapped<t, transformed, $>, $>
	>(
		// v isn't used directly here but helps TS infer a precise type for transformed
		flatMapEntry: (entry: typePropOf<t, $>) => transformed
	): r extends infer _ ? _ : never

	/**
	 * #### each property's kind, key, value and default
	 *
	 * @example
	 * const Settings = type({ theme: "'light' | 'dark' = 'light'" })
	 * // [{ kind: "optional", key: "theme", value: Type<"light" | "dark">, default: "light" }]
	 * const props = Settings.props
	 */
	// readonly [] rather than @ark/util's array, which a consumer's emitted
	// declarations could only name through arktype/internal
	props: readonly typePropOf<t, $>[]
}

type selectiveKeyOf<t> =
	[t] extends [array] ? propKeyOf<t> & Key
	: [t] extends [TerminallyInferredObject] ? never
	: arkKeyOf<t>

type selectiveRequired<t, key> =
	exactEquals<t, object> extends true ? object
	: t extends unknown ?
		show<
			{
				[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
			} & {
				[k in keyof t as Extract<toArkKey<t, k>, key>]-?: withoutDefault<t[k]>
			}
		>
	:	never

type selectivePartial<t, key> =
	exactEquals<t, object> extends true ? object
	: t extends unknown ?
		show<
			{
				[k in keyof t as isInferredDefault<t[k]> extends true ? toArkKey<t, k>
				:	Exclude<toArkKey<t, k>, key>]: t[k]
			} & {
				[k in keyof t as isInferredDefault<t[k]> extends true ? never
				:	Extract<toArkKey<t, k>, key>]?: t[k]
			}
		>
	:	never

// a defaulted key is optional at runtime, so like an optional key's, the value
// .get reads there includes undefined
type gotAt<o, k extends arkIndexableOf<o>> = undefaulted<arkGet<o, k>>

type undefaulted<v> =
	[v] extends [anyOrNever] ? v
	: v extends Default<infer t> ? t | undefined
	: v extends (...args: never) => anyOrNever ? v
	: v extends InferredMorph<Default<infer i, never>, infer out> ?
		((In: i) => out) | undefined
	:	v

// a nested key is read through an undefined parent, as .get does at runtime
type definedAt<o, k extends arkIndexableOf<o>> = Exclude<gotAt<o, k>, undefined>

type undefinedAt<o, k extends arkIndexableOf<o>> =
	undefined extends gotAt<o, k> ? undefined : never

// each branch's props, since a union's are mapped per branch
type typePropOf<o, $> =
	o extends unknown ?
		propKeyOf<o> extends infer k ?
			k extends keyof o ?
				typeProp<o, k, $>
			:	never
		:	never
	:	never

// an array's elements and methods (and Date's methods) aren't props at runtime,
// only keys intersected onto them, e.g. type("string[]").and({ length: "1" })
type propKeyOf<o> =
	o extends array ?
		arrayBaseOf<o> extends infer base ?
			[base, keyof o] extends [o, keyof base] ?
				never
			:	intersectedPropKeyOf<o, base, number | `${number}` | typeof brand>
		:	never
	: o extends Date ?
		[Date, keyof o] extends [o, keyof Date] ?
			never
		:	intersectedPropKeyOf<o, Date, typeof brand>
	:	Exclude<keyof o, typeof brand>

type arrayBaseOf<o extends array> =
	o extends unknown[] ? [...o] : readonly [...o]

type intersectedPropKeyOf<o, base, excluded = never> = keyof {
	[k in Exclude<keyof o, excluded> as k extends keyof base ?
		isInheritedKey<o, base, k> extends true ?
			never
		:	k
	:	k]: 0
}

type isInheritedKey<o, base, k extends keyof o & keyof base> =
	base[k] extends o[k] ? true
	: base[k] extends (...args: infer a) => base ?
		((...args: a) => o) extends o[k] ?
			true
		:	false
	:	false

// checked whole, since a prop's value is one Type, whatever its branches
type typeProp<o, k extends keyof o, $, v = propValueOf<o, k>> =
	[v] extends [Default<infer t, infer defaultValue>] ?
		DefaultedTypeProp<k & Key, t, defaultValue, $>
	: [v] extends (
		[InferredMorph<Default<infer i, infer defaultValue>, infer out>]
	) ?
		DefaultedTypeProp<k & Key, (In: i) => out, defaultValue, $>
	:	BaseTypeProp<
			k extends optionalKeyOf<o> ? "optional" : "required",
			k & Key,
			v,
			$
		>

// an optional key's value without the undefined its `?` adds, as `-?` reads
// it, so it keeps an undefined it was given only with exactOptionalPropertyTypes
type propValueOf<o, k extends keyof o> =
	k extends optionalKeyOf<o> ? Required<o>[k] : o[k]

export interface BaseTypeProp<
	kind extends Prop.Kind = Prop.Kind,
	k extends Key = Key,
	/** @ts-ignore cast variance */
	out v = unknown,
	$ = {}
> {
	kind: kind
	key: k
	value: instantiateType<v, $>
	meta: ArkEnv.meta
	toJSON: () => JsonStructure
}

export interface DefaultedTypeProp<
	k extends Key = Key,
	v = unknown,
	defaultValue = v,
	$ = {}
> extends BaseTypeProp<"optional", k, v, $> {
	default: defaultValue
}

type MappedTypeProp<k extends Key = Key, v = unknown> =
	| BaseMappedTypeProp<k, v>
	| OptionalMappedTypeProp<k, v>

type BaseMappedTypeProp<k extends Key, v> = merge<
	BaseMappedPropInner,
	{
		key: k
		value: type.cast<v>
	}
>

type OptionalMappedTypeProp<k extends Key, v> = merge<
	OptionalMappedPropInner,
	{
		key: k
		value: type.cast<v>
		default?: v
	}
>

// a union is mapped per branch, each built from the props it can produce
type mapped<t, transformed extends listable<MappedTypeProp>, $> =
	[t] extends [intersectUnion<t>] ? constructMapped<t, transformed>
	:	mappedBranches<
			t,
			transformed extends array ? transformed[number] : transformed,
			typePropOf<t, $>,
			t extends unknown ? keyof t : never,
			$
		>

type mappedBranches<branch, prop, entry, key, $> =
	branch extends unknown ?
		constructMapped<branch, branchPropsOf<branch, prop, entry, key, $>>
	:	never

// the branch's own props as they were, other props at its keys, and props at keys no branch has
type branchPropsOf<branch, prop, entry, key, $> =
	| Extract<prop, typePropOf<branch, $>>
	| (Exclude<prop, entry> extends infer p ?
			p extends { key: infer k } ?
				k extends keyof branch ? p
				: k extends key ? never
				: p
			:	never
	  :	never)

type constructMapped<t, transformed extends listable<MappedTypeProp>> = show<
	intersectUnion<
		fromTypeProps<t, transformed extends array ? transformed : [transformed]>
	>
>

type fromTypeProps<t, props extends array<MappedTypeProp>> = show<
	{
		[prop in props[number] as Extract<
			applyHomomorphicOptionality<t, prop>,
			{ kind: "required" }
		>["key"]]: prop["value"][inferred]
	} & {
		[prop in props[number] as Extract<
			applyHomomorphicOptionality<t, prop>,
			{ kind: "optional"; default?: never }
		>["key"]]?: prop["value"][inferred]
	} & {
		[prop in props[number] as Extract<
			applyHomomorphicOptionality<t, prop>,
			{ kind: "optional"; default: unknown }
		>["key"]]: withDefault<
			prop["value"][inferred],
			prop["default" & keyof prop]
		>
	}
>

export type NonObjectMergeErrorMessage = "Merged type must be an object"

type applyHomomorphicOptionality<t, prop extends MappedTypeProp> =
	prop["kind"] extends string ? prop
	:	prop & {
			kind: prop["key"] extends optionalKeyOf<t> ? "optional" : "required"
		}

export type { Type as ObjectType }
