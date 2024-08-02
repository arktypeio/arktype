import type { type } from "../ark.js"
import type { arkKeyOf, getArkKey, toArkKey } from "../keys.js"
import type { Type as BaseType, instantiateType } from "../type.js"

/** @ts-ignore cast variance */
interface Type<out t extends object = object, $ = {}> extends BaseType<t, $> {
	get<k1 extends arkKeyOf<t>, r = instantiateType<getArkKey<t, k1>, $>>(
		k1: k1 | type.cast<k1>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		r = instantiateType<getArkKey<getArkKey<t, k1>, k2>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		k3 extends arkKeyOf<getArkKey<getArkKey<t, k1>, k2>>,
		r = instantiateType<getArkKey<getArkKey<getArkKey<t, k1>, k2>, k3>, $>
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

	required(): Type<{ [k in keyof t]-?: t[k] }, $>

	partial(): Type<{ [k in keyof t]?: t[k] }, $>
}

export type { Type as ObjectType }
