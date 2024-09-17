import type { BaseMappedPropInner, OptionalMappedPropInner } from "@ark/schema"
import type {
	anyOrNever,
	arkGet,
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
	Default,
	InferredDefault,
	InferredOptional
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

	get<k1 extends arkKeyOf<t>, r = instantiateType<arkGet<t, k1>, $>>(
		k1: k1 | type.cast<k1>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<arkGet<t, k1>>,
		r = instantiateType<arkGet<arkGet<t, k1>, k2>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<arkGet<t, k1>>,
		k3 extends arkKeyOf<arkGet<arkGet<t, k1>, k2>>,
		r = instantiateType<arkGet<arkGet<arkGet<t, k1>, k2>, k3>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): r

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
	): Type<merge<t, r & object>, $>

	required(): Type<{ [k in keyof t]-?: t[k] }, $>

	partial(): Type<{ [k in keyof t]?: t[k] }, $>

	map<transformed extends listable<MappedTypeProp<Key, v>>, v = unknown>(
		// v isn't used directly here but helps TS infer a precise type for transformed
		flatMapEntry: (entry: typePropOf<t, $>) => transformed
	): Type<constructMapped<t, transformed>, $>

	props: array<typePropOf<t, $>>
}

type typePropOf<o, $> = {
	[k in keyof o]-?: typeProp<o, k, $>
}[keyof o] &
	unknown

type typeProp<o, k extends keyof o, $, t = o[k] & ({} | null)> =
	t extends InferredDefault<infer v, infer defaultValue> ?
		{
			kind: "optional"
			key: k
			value: instantiateType<v, $>
			meta: ArkEnv.meta
			default: defaultValue
			toJSON: () => Json
		}
	:	{
			kind: k extends optionalKeyOf<o> ? "optional"
			: t extends InferredOptional ?
				[t] extends [anyOrNever] ?
					"required"
				:	"optional"
			:	"required"
			key: k
			value: instantiateType<t, $>
			meta: ArkEnv.meta
			toJSON: () => Json
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
		>["key"]]: (
			In?: prop["value"][inferred]
		) => Default<prop["default" & keyof prop]>
	}
>

type applyHomomorphicOptionality<t, prop extends MappedTypeProp> =
	prop["kind"] extends string ? prop
	:	prop & {
			kind: prop["key"] extends optionalKeyOf<t> ? "optional" : "required"
		}

export type { Type as ObjectType }
