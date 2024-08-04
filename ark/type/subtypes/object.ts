import type {
	ErrorType,
	indexableOf,
	indexInto,
	keyOf,
	merge,
	pathInto,
	tsKeyToArkKey
} from "@ark/util"
import type { type } from "../ark.js"

import type { inferTypeRoot, validateTypeRoot } from "../type.js"
import type { instantiateType } from "./instantiate.js"
import type { ValidatorType } from "./validator.js"

/** @ts-ignore cast variance */
interface Type<out t extends object = object, $ = {}>
	extends ValidatorType<t, $> {
	keyof(): instantiateType<indexableOf<t>, $>

	get<k1 extends indexableOf<t>, r = instantiateType<indexInto<t, k1>, $>>(
		k1: k1 | type.cast<k1>
	): r
	get<
		k1 extends indexableOf<t>,
		k2 extends indexableOf<indexInto<t, k1>>,
		r = instantiateType<pathInto<t, [k1, k2]>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): r
	get<
		k1 extends indexableOf<t>,
		k2 extends indexableOf<indexInto<t, k1>>,
		k3 extends indexableOf<pathInto<t, [k1, k2]>>,
		r = instantiateType<pathInto<t, [k1, k2, k3]>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): r

	pick<const key extends keyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Extract<tsKeyToArkKey<t, k>, key>]: t[k]
		},
		$
	>

	omit<const key extends keyOf<t> = never>(
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Exclude<tsKeyToArkKey<t, k>, key>]: t[k]
		},
		$
	>

	merge<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $> &
			(r extends object ? unknown
			:	ErrorType<"Merged type must be an object", [actual: r]>)
	): Type<merge<t, r & object>, $>

	required(): Type<{ [k in keyof t]-?: t[k] }, $>

	partial(): Type<{ [k in keyof t]?: t[k] }, $>
}

export type { Type as ObjectType }
