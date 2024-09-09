import type {
	array,
	ErrorType,
	inferred,
	intersectUnion,
	Key,
	listable,
	merge,
	optionalKeyOf,
	show
} from "@ark/util"
import type { arkGet, arkKeyOf, toArkKey, TypeKey } from "../keys.ts"
import type { type } from "../keywords/ark.ts"
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

	map<transformed extends listable<TypeEntry<TypeKey, v>>, v = unknown>(
		// v isn't used directly here but helps TS infer a precise type for transformed
		flatMapEntry: (entry: typeEntryOf<t, $>) => transformed
	): Type<constructMapped<t, transformed>, $>
}

export type TypeEntry<k extends TypeKey = TypeKey, v = unknown> = readonly [
	k,
	type.cast<v>
]

type TypeEntries = array<TypeEntry>

type typeEntryOf<t, $> = {
	[k in keyof t]-?: [k, instantiateType<t[k] & ({} | null), $>]
}[keyof t] &
	unknown

type constructMapped<t, transformed extends listable<TypeEntry>> = show<
	intersectUnion<
		fromTypeEntries<
			t,
			transformed extends TypeEntries ? transformed : [transformed]
		>
	>
>

type fromTypeEntries<t, entries extends TypeEntries> = show<
	{
		[entry in entries[number] as Exclude<
			inferTypeKey<entry[0]>,
			optionalKeyOf<t>
		>]: entry[1][inferred]
	} & {
		[entry in entries[number] as Extract<
			inferTypeKey<entry[0]>,
			optionalKeyOf<t>
		>]?: entry[1][inferred]
	}
>

type inferTypeKey<k extends TypeKey> =
	k extends Key ? k
	: k extends type.cast<infer t extends Key> ? t
	: never

export type { Type as ObjectType }
