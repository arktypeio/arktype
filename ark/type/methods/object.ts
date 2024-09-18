import type {
	BaseMappedPropInner,
	OptionalMappedPropInner,
	Prop
} from "@ark/schema"
import type {
	arkGet,
	arkIndexableOf,
	arkKeyOf,
	array,
	ErrorType,
	inferred,
	intersectUnion,
	Json,
	Key,
	listable,
	merge,
	optionalKeyOf,
	show,
	toArkKey
} from "@ark/util"
import type {
	applyConstraint,
	constrain,
	Default,
	Optional,
	parseConstraints
} from "../keywords/inference.ts"
import type { type } from "../keywords/keywords.ts"
import type { ArrayType } from "./array.ts"
import type { instantiateType } from "./instantiate.ts"
import type { ValidatorType } from "./validator.ts"

/** @ts-ignore cast variance */
interface Type<out t extends object = object, $ = {}>
	extends ValidatorType<t, $> {
	readonly(): t extends array ? ArrayType<{ readonly [i in keyof t]: t[i] }, $>
	:	Type<{ readonly [k in keyof t]: t[k] }, $>

	keyof(): instantiateType<arkKeyOf<t>, $>

	get<const k1 extends arkIndexableOf<t>>(
		k1: k1 | type.cast<k1>
	): instantiateType<arkGet<t, k1>, $> extends infer r ? r : never
	get<
		const k1 extends arkIndexableOf<t>,
		const k2 extends arkIndexableOf<arkGet<t, k1>>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): instantiateType<arkGet<arkGet<t, k1>, k2>, $> extends infer r ? r : never
	get<
		const k1 extends arkIndexableOf<t>,
		const k2 extends arkIndexableOf<arkGet<t, k1>>,
		const k3 extends arkIndexableOf<arkGet<arkGet<t, k1>, k2>>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): instantiateType<arkGet<arkGet<arkGet<t, k1>, k2>, k3>, $> extends infer r ?
		r
	:	never

	pick<const key extends arkKeyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Extract<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	omit<const key extends arkKeyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	merge<const def, r = type.infer<def, $>>(
		def: type.validate<def, $> &
			(r extends object ? unknown
			:	ErrorType<"Merged type must be an object", [actual: r]>)
	): Type<merge<t, NoInfer<r & object>>, $>

	required(): Type<{ [k in keyof t]-?: t[k] }, $>

	partial(): Type<{ [k in keyof t]?: t[k] }, $>

	map<transformed extends listable<MappedTypeProp>>(
		// v isn't used directly here but helps TS infer a precise type for transformed
		flatMapEntry: (entry: typePropOf<t, $>) => transformed
	): Type<constructMapped<t, transformed>, $>

	props: array<typePropOf<t, $>>
}

type typePropOf<o, $> =
	keyof o extends infer k ?
		k extends keyof o ?
			typeProp<o, k, $>
		:	never
	:	never

type typeProp<o, k extends keyof o, $, t = o[k] & ({} | null)> =
	parseConstraints<t> extends (
		[infer base, infer constraints extends Default | Optional]
	) ?
		constraints extends Default<infer defaultValue> ?
			DefaultedTypeProp<
				k & Key,
				keyof constraints extends keyof Default ? base
				:	constrain<base, Omit<constraints, keyof Default>>,
				defaultValue,
				$
			>
		: constraints extends Optional ?
			BaseTypeProp<
				"optional",
				k & Key,
				keyof constraints extends keyof Optional ? base
				:	constrain<base, Omit<constraints, keyof Optional>>,
				$
			>
		:	never
	:	BaseTypeProp<
			k extends optionalKeyOf<o> ? "optional" : "required",
			k & Key,
			t,
			$
		>

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
	toJSON: () => Json
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
		>["key"]]: applyConstraint<
			prop["value"][inferred],
			Default<prop["default" & keyof prop]>
		>
	}
>

type applyHomomorphicOptionality<t, prop extends MappedTypeProp> =
	prop["kind"] extends string ? prop
	:	prop & {
			kind: prop["key"] extends optionalKeyOf<t> ? "optional" : "required"
		}

export type { Type as ObjectType }
